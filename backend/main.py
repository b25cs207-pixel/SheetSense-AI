import os
import uuid
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import pandas as pd
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from pydantic import BaseModel

from backend.config import settings, UPLOAD_DIR, SAMPLES_DIR
from backend.database.db import (
    init_db, save_dataset, get_dataset, list_datasets, delete_dataset,
    save_chat_message, get_chat_history, update_share_status, get_dataset_by_share_token,
    save_dataset_version, get_dataset_versions, get_dataset_version, update_dataset_domain
)
from backend.parsers.modular_ingestion import ingest_source
from backend.engine.profiler import profile_dataset
from backend.engine.statistics import compute_dataset_statistics
from backend.engine.charts import generate_candidate_charts
from backend.engine.recommendations import generate_proactive_recommendations, execute_recommendation
from backend.engine.cleaner import clean_dataset
from backend.engine.domain_analyzer import (
    DOMAIN_DEFINITIONS, detect_data_domain, mask_financial_data,
    generate_domain_kpis, generate_educational_concepts
)
from backend.engine.editor import (
    apply_cell_edits, add_spreadsheet_row, delete_spreadsheet_rows,
    add_spreadsheet_column, rename_spreadsheet_column, delete_spreadsheet_column,
    find_and_replace_text, evaluate_spreadsheet_formulas, apply_quick_cleaning_action
)
from backend.ai.insights import generate_insights
from backend.ai.chat import ask_data_chat
from backend.exports.csv_exporter import export_to_safe_csv
from backend.exports.excel_exporter import export_to_excel
from backend.exports.pdf_exporter import generate_pdf_report

# Initialize database
init_db()

app = FastAPI(title=settings.PROJECT_NAME, version=settings.VERSION)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory dataframe cache for active datasets: id -> pd.DataFrame
DF_CACHE: Dict[str, pd.DataFrame] = {}

def get_df_for_dataset(dataset_id: str) -> pd.DataFrame:
    if dataset_id in DF_CACHE:
        return DF_CACHE[dataset_id]
    ds = get_dataset(dataset_id)
    if not ds or not os.path.exists(ds["file_path"]):
        raise HTTPException(status_code=404, detail="Dataset not found or underlying file is missing.")
    
    file_path = ds["file_path"]
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(file_path)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(file_path)
    elif ext == ".json":
        df = pd.read_json(file_path)
    else:
        df = pd.read_csv(file_path, on_bad_lines="skip")
    DF_CACHE[dataset_id] = df
    return df

def analyze_and_store_dataframe(
    df: pd.DataFrame,
    name: str,
    filename: str,
    source_type: str,
    file_path: str,
    original_file_path: Optional[str] = None,
    warnings: List[str] = None,
    text_content: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    dataset_id = f"ds_{uuid.uuid4().hex[:10]}"
    
    # Run full analytics pipeline
    schema_profile = profile_dataset(df)
    stats = compute_dataset_statistics(df, schema_profile)

    # Domain intelligence detection
    domain_key, domain_conf, domain_expl = detect_data_domain(df, text_content)
    domain_kpis = generate_domain_kpis(df, domain_key, schema_profile, stats)
    stats["domain_kpis"] = domain_kpis
    stats["domain_info"] = {
        "domain": domain_key,
        "title": DOMAIN_DEFINITIONS.get(domain_key, {}).get("title", "General Analysis"),
        "confidence": domain_conf,
        "explanation": domain_expl
    }

    candidate_charts = generate_candidate_charts(df, schema_profile, stats)
    recommendations = generate_proactive_recommendations(df, schema_profile, stats)
    insights = generate_insights(schema_profile, stats, provider_type=settings.AI_PROVIDER, api_key=settings.GEMINI_API_KEY)
    
    # Assemble complete analysis bundle
    summary_bundle = {
        "stats": stats,
        "charts": candidate_charts,
        "insights": insights,
        "recommendations": recommendations,
        "warnings": warnings or [],
        "text_content": text_content,
        "metadata": metadata or {}
    }
    
    orig_path = original_file_path or file_path
    record = {
        "id": dataset_id,
        "name": name,
        "filename": filename,
        "source_type": source_type,
        "file_path": file_path,
        "original_file_path": orig_path,
        "row_count": len(df),
        "col_count": len(df.columns),
        "schema": schema_profile,
        "quality": schema_profile.get("summary", {}),
        "summary": summary_bundle,
        "domain": domain_key,
        "analysis_mode": "auto",
        "custom_objective": None,
        "version_count": 1,
        "is_shared": 0,
        "share_token": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    save_dataset(record)
    save_dataset_version(
        dataset_id=dataset_id,
        version_number=1,
        file_path=file_path,
        change_summary="Initial File Ingestion",
        changes=[],
        row_count=len(df),
        col_count=len(df.columns)
    )
    DF_CACHE[dataset_id] = df
    return record

def recalculate_and_persist_dataset(
    dataset_id: str,
    df: pd.DataFrame,
    change_summary: str,
    changes: List[Dict[str, Any]] = None
) -> Dict[str, Any]:
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    # Save working copy to disk
    working_path = ds["file_path"]
    df.to_csv(working_path, index=False)
    DF_CACHE[dataset_id] = df
    
    # Re-run full profiling & analytics pipeline
    schema_profile = profile_dataset(df)
    stats = compute_dataset_statistics(df, schema_profile)
    
    # Domain KPIs
    domain_key = ds.get("domain") or "auto"
    if domain_key == "auto":
        domain_key, conf, expl = detect_data_domain(df)
    domain_kpis = generate_domain_kpis(df, domain_key, schema_profile, stats)
    stats["domain_kpis"] = domain_kpis
    stats["domain_info"] = {
        "domain": domain_key,
        "title": DOMAIN_DEFINITIONS.get(domain_key, {}).get("title", "General Analysis")
    }
    
    candidate_charts = generate_candidate_charts(df, schema_profile, stats)
    recommendations = generate_proactive_recommendations(df, schema_profile, stats)
    insights = generate_insights(schema_profile, stats, provider_type=settings.AI_PROVIDER, api_key=settings.GEMINI_API_KEY)
    
    new_version_num = (ds.get("version_count") or 1) + 1
    
    # Archive version file
    archive_filename = f"{dataset_id}_v{new_version_num}.csv"
    archive_path = str(UPLOAD_DIR / archive_filename)
    df.to_csv(archive_path, index=False)
    
    save_dataset_version(
        dataset_id=dataset_id,
        version_number=new_version_num,
        file_path=archive_path,
        change_summary=change_summary,
        changes=changes or [],
        row_count=len(df),
        col_count=len(df.columns)
    )
    
    old_summary = ds.get("summary", {})
    summary_bundle = {
        "stats": stats,
        "charts": candidate_charts,
        "insights": insights,
        "recommendations": recommendations,
        "warnings": old_summary.get("warnings", []),
        "text_content": old_summary.get("text_content"),
        "metadata": old_summary.get("metadata", {}),
        "last_cleaning_report": change_summary
    }
    
    record = {
        "id": dataset_id,
        "name": ds["name"],
        "filename": ds["filename"],
        "source_type": ds["source_type"],
        "file_path": working_path,
        "original_file_path": ds.get("original_file_path", working_path),
        "row_count": len(df),
        "col_count": len(df.columns),
        "schema": schema_profile,
        "quality": schema_profile.get("summary", {}),
        "summary": summary_bundle,
        "domain": domain_key,
        "analysis_mode": ds.get("analysis_mode", "auto"),
        "custom_objective": ds.get("custom_objective"),
        "version_count": new_version_num,
        "is_shared": ds.get("is_shared", 0),
        "share_token": ds.get("share_token"),
        "created_at": ds["created_at"]
    }
    save_dataset(record)
    return record

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY)
    }

@app.post("/api/upload")
async def upload_file(
    file: UploadFile = File(...),
    sheet_name: Optional[str] = Form(None)
):
    try:
        content = await file.read()
        filename = file.filename or "upload.csv"
        
        parsed = ingest_source(
            source_type="file",
            file_bytes=content,
            filename=filename,
            sheet_name=sheet_name
        )
        
        if parsed.df is None and parsed.text_content:
            from backend.parsers.document_structurer import structure_text_content
            df_struct, struct_warn, struct_meta = structure_text_content(parsed.text_content, filename)
            if df_struct is not None:
                parsed.df = df_struct
                parsed.warnings.extend(struct_warn)
                parsed.metadata.update(struct_meta)

        if parsed.df is None:
            warn_msg = parsed.warnings[0] if parsed.warnings else "No extractable text or numerical values detected."
            return JSONResponse(status_code=400, content={
                "error": f"Could not extract data from '{filename}': {warn_msg}",
                "detail": f"The file contains no readable tables, numbers, or text content. Please upload a spreadsheet (CSV, Excel) or a document/image containing numerical or tabular information.",
                "warnings": parsed.warnings,
                "text_content": parsed.text_content
            })

        # Save original untouched file and editable working copy
        orig_filename = f"orig_{uuid.uuid4().hex[:8]}_{filename}.csv"
        orig_path = str(UPLOAD_DIR / orig_filename)
        work_filename = f"work_{uuid.uuid4().hex[:8]}_{filename}.csv"
        work_path = str(UPLOAD_DIR / work_filename)
        parsed.df.to_csv(orig_path, index=False)
        parsed.df.to_csv(work_path, index=False)

        res = analyze_and_store_dataframe(
            df=parsed.df,
            name=os.path.splitext(filename)[0].replace("_", " ").title(),
            filename=filename,
            source_type=os.path.splitext(filename)[1].replace(".", "").upper() or "FILE",
            file_path=work_path,
            original_file_path=orig_path,
            warnings=parsed.warnings,
            text_content=parsed.text_content,
            metadata=parsed.metadata
        )
        if parsed.sheets:
            res["available_sheets"] = parsed.sheets
            res["active_sheet"] = parsed.active_sheet

        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload processing failed: {str(e)}")

class UrlRequest(BaseModel):
    url: str

@app.post("/api/upload/url")
def upload_url(req: UrlRequest):
    try:
        parsed = ingest_source(source_type="url", url=req.url)
        if parsed.df is None and parsed.text_content:
            from backend.parsers.document_structurer import structure_text_content
            df_struct, struct_warn, struct_meta = structure_text_content(parsed.text_content, req.url)
            if df_struct is not None:
                parsed.df = df_struct
                parsed.warnings.extend(struct_warn)
                parsed.metadata.update(struct_meta)

        if parsed.df is None:
            warn_msg = parsed.warnings[0] if parsed.warnings else "No extractable table or metrics found."
            return JSONResponse(status_code=400, content={
                "error": f"Failed to extract tabular data from URL: {warn_msg}",
                "detail": "The URL responded with content but no structured data tables or numerical values were detected.",
                "warnings": parsed.warnings,
                "text_content": parsed.text_content
            })

        orig_filename = f"orig_url_{uuid.uuid4().hex[:8]}.csv"
        orig_path = str(UPLOAD_DIR / orig_filename)
        work_filename = f"work_url_{uuid.uuid4().hex[:8]}.csv"
        work_path = str(UPLOAD_DIR / work_filename)
        parsed.df.to_csv(orig_path, index=False)
        parsed.df.to_csv(work_path, index=False)

        name = req.url.split("/")[-1] or "Remote Source"
        return analyze_and_store_dataframe(
            df=parsed.df,
            name=name[:30],
            filename=req.url,
            source_type="URL",
            file_path=work_path,
            original_file_path=orig_path,
            warnings=parsed.warnings,
            text_content=parsed.text_content,
            metadata=parsed.metadata
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL ingestion failed: {str(e)}")

@app.post("/api/sample/{sample_name}")
def load_sample_dataset(sample_name: str):
    valid_samples = {
        "sales": ("sales_performance.csv", "Sales Performance Analysis"),
        "student_performance": ("student_performance.csv", "Student Academic Performance"),
        "ecommerce_orders": ("ecommerce_orders.csv", "E-Commerce Customer Orders"),
        "employee_attendance": ("employee_attendance.csv", "Employee Attendance & HR Logs")
    }
    if sample_name not in valid_samples:
        raise HTTPException(status_code=400, detail=f"Sample '{sample_name}' not found. Available: {list(valid_samples.keys())}")

    file_name, display_name = valid_samples[sample_name]
    sample_file_path = SAMPLES_DIR / file_name

    # If file doesn't exist, generate them
    if not sample_file_path.exists():
        from backend.samples.sample_data_generator import generate_all_samples
        generate_all_samples()

    df = pd.read_csv(str(sample_file_path))
    
    # Save original untouched and working copy
    orig_path = str(UPLOAD_DIR / f"orig_sample_{uuid.uuid4().hex[:8]}_{file_name}")
    work_path = str(UPLOAD_DIR / f"work_sample_{uuid.uuid4().hex[:8]}_{file_name}")
    df.to_csv(orig_path, index=False)
    df.to_csv(work_path, index=False)

    return analyze_and_store_dataframe(
        df=df,
        name=display_name,
        filename=file_name,
        source_type="SAMPLE",
        file_path=work_path,
        original_file_path=orig_path,
        warnings=[f"Loaded '{display_name}' sample dataset for evaluation."]
    )

@app.get("/api/datasets")
def get_datasets_list():
    return list_datasets()

@app.get("/api/datasets/{dataset_id}")
def get_single_dataset(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    return ds

@app.delete("/api/datasets/{dataset_id}")
def delete_single_dataset(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    # Remove file from disk
    if os.path.exists(ds["file_path"]):
        try:
            os.remove(ds["file_path"])
        except Exception:
            pass
            
    DF_CACHE.pop(dataset_id, None)
    deleted = delete_dataset(dataset_id)
    return {"success": deleted, "message": f"Dataset {dataset_id} deleted."}

class CleanActionRequest(BaseModel):
    action: str  # drop_duplicates, drop_missing, impute_missing, filter_outliers, convert_type, rename_column
    params: Optional[Dict[str, Any]] = None

@app.post("/api/datasets/{dataset_id}/clean")
def run_clean_operation(dataset_id: str, req: CleanActionRequest):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = get_df_for_dataset(dataset_id)
    cleaned_df, report = clean_dataset(df, req.action, req.params)
    
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=cleaned_df,
        change_summary=report.get("message", f"Cleaned: {req.action}")
    )
    return {"report": report, "dataset": record}

# ==================== DOMAIN INTELLIGENCE API ====================

class DomainUpdateRequest(BaseModel):
    domain: str
    analysis_mode: str = "industry"
    custom_objective: Optional[str] = None

@app.post("/api/datasets/{dataset_id}/domain")
def update_domain(dataset_id: str, req: DomainUpdateRequest):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = get_df_for_dataset(dataset_id)
    target_domain = req.domain if req.domain != "auto" else detect_data_domain(df)[0]
    update_dataset_domain(dataset_id, target_domain, req.analysis_mode, req.custom_objective)
    
    # Re-profile with new domain
    schema_profile = ds["schema"]
    stats = ds["summary"].get("stats", {})
    stats["domain_kpis"] = generate_domain_kpis(df, target_domain, schema_profile, stats)
    stats["domain_info"] = {
        "domain": target_domain,
        "title": DOMAIN_DEFINITIONS.get(target_domain, {}).get("title", "General Analysis")
    }
    
    if req.custom_objective:
        tailored_insights = generate_insights(
            schema_profile, stats,
            provider_type=settings.AI_PROVIDER,
            api_key=settings.GEMINI_API_KEY
        )
        ds["summary"]["insights"] = tailored_insights
    
    ds["domain"] = target_domain
    ds["analysis_mode"] = req.analysis_mode
    ds["custom_objective"] = req.custom_objective
    ds["summary"]["stats"] = stats
    save_dataset(ds)
    return ds

@app.get("/api/datasets/{dataset_id}/educational-concepts")
def get_educational_concepts_endpoint(dataset_id: str):
    return generate_educational_concepts()

@app.post("/api/datasets/{dataset_id}/mask-financial")
def mask_financial_view(dataset_id: str):
    df = get_df_for_dataset(dataset_id)
    masked = mask_financial_data(df)
    return {
        "columns": list(masked.columns),
        "sample_rows": masked.head(20).to_dict(orient="records")
    }

# ==================== SPREADSHEET EDITOR API ====================

class EditorSaveRequest(BaseModel):
    changes: List[Dict[str, Any]] = []
    evaluate_formulas: bool = True
    summary: Optional[str] = "Spreadsheet Manual Edits"

@app.get("/api/datasets/{dataset_id}/editor/rows")
def get_editor_grid_data(
    dataset_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500)
):
    df = get_df_for_dataset(dataset_id)
    total_rows = len(df)
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_rows)
    
    sliced = df.iloc[start_idx:end_idx].copy()
    records = []
    for idx, row in sliced.iterrows():
        row_dict = {"_row_index": int(idx)}
        for c in df.columns:
            val = row[c]
            row_dict[c] = "" if pd.isna(val) else val
        records.append(row_dict)

    col_meta = []
    for c in df.columns:
        dt = "numeric" if pd.api.types.is_numeric_dtype(df[c]) else ("datetime" if pd.api.types.is_datetime64_any_dtype(df[c]) else "text")
        col_meta.append({
            "name": c,
            "type": dt,
            "null_count": int(df[c].isna().sum())
        })

    return {
        "total_rows": total_rows,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total_rows + page_size - 1) // page_size),
        "columns": col_meta,
        "rows": records
    }

@app.post("/api/datasets/{dataset_id}/editor/save")
def save_editor_changes(dataset_id: str, req: EditorSaveRequest):
    df = get_df_for_dataset(dataset_id)
    updated_df = df.copy()
    
    if req.changes:
        updated_df, edit_res = apply_cell_edits(updated_df, req.changes)
    
    eval_count = 0
    if req.evaluate_formulas:
        updated_df, eval_count = evaluate_spreadsheet_formulas(updated_df)
    
    summary_text = req.summary or f"Applied {len(req.changes)} edits"
    if eval_count > 0:
        summary_text += f" & evaluated {eval_count} formulas"
        
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated_df,
        change_summary=summary_text,
        changes=req.changes
    )
    return {
        "status": "success",
        "applied_edits": len(req.changes),
        "evaluated_formulas": eval_count,
        "version": record["version_count"],
        "dataset": record
    }

class AddRowRequest(BaseModel):
    row_data: Optional[Dict[str, Any]] = None

@app.post("/api/datasets/{dataset_id}/editor/row/add")
def add_row_endpoint(dataset_id: str, req: AddRowRequest):
    df = get_df_for_dataset(dataset_id)
    updated = add_spreadsheet_row(df, req.row_data)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Added new row (total: {len(updated)})"
    )
    return {"status": "success", "row_count": len(updated), "dataset": record}

class DeleteRowsRequest(BaseModel):
    indices: List[int]

@app.post("/api/datasets/{dataset_id}/editor/row/delete")
def delete_rows_endpoint(dataset_id: str, req: DeleteRowsRequest):
    df = get_df_for_dataset(dataset_id)
    updated = delete_spreadsheet_rows(df, req.indices)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Deleted {len(req.indices)} row(s)"
    )
    return {"status": "success", "row_count": len(updated), "dataset": record}

class AddColumnRequest(BaseModel):
    col_name: str
    col_type: str = "text"
    default_val: Optional[Any] = ""

@app.post("/api/datasets/{dataset_id}/editor/column/add")
def add_column_endpoint(dataset_id: str, req: AddColumnRequest):
    df = get_df_for_dataset(dataset_id)
    updated = add_spreadsheet_column(df, req.col_name, req.col_type, req.default_val)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Added column '{req.col_name}' ({req.col_type})"
    )
    return {"status": "success", "col_count": len(updated.columns), "dataset": record}

class RenameColumnRequest(BaseModel):
    old_name: str
    new_name: str

@app.post("/api/datasets/{dataset_id}/editor/column/rename")
def rename_column_endpoint(dataset_id: str, req: RenameColumnRequest):
    df = get_df_for_dataset(dataset_id)
    updated = rename_spreadsheet_column(df, req.old_name, req.new_name)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Renamed column '{req.old_name}' to '{req.new_name}'"
    )
    return {"status": "success", "dataset": record}

class DeleteColumnRequest(BaseModel):
    col_name: str

@app.post("/api/datasets/{dataset_id}/editor/column/delete")
def delete_column_endpoint(dataset_id: str, req: DeleteColumnRequest):
    df = get_df_for_dataset(dataset_id)
    if len(df.columns) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the only remaining column.")
    updated = delete_spreadsheet_column(df, req.col_name)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Deleted column '{req.col_name}'"
    )
    return {"status": "success", "col_count": len(updated.columns), "dataset": record}

class FindReplaceRequest(BaseModel):
    search_term: str
    replace_term: str
    target_column: Optional[str] = None
    match_case: bool = False

@app.post("/api/datasets/{dataset_id}/editor/find-replace")
def find_replace_endpoint(dataset_id: str, req: FindReplaceRequest):
    df = get_df_for_dataset(dataset_id)
    updated, matches = find_and_replace_text(
        df=df,
        search_term=req.search_term,
        replace_term=req.replace_term,
        target_column=req.target_column,
        match_case=req.match_case
    )
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=f"Replaced {matches} occurrence(s) of '{req.search_term}' with '{req.replace_term}'"
    )
    return {"status": "success", "matches_replaced": matches, "dataset": record}

class QuickCleanRequest(BaseModel):
    action: str
    column: Optional[str] = None

@app.post("/api/datasets/{dataset_id}/editor/quick-clean")
def quick_clean_endpoint(dataset_id: str, req: QuickCleanRequest):
    df = get_df_for_dataset(dataset_id)
    updated, message = apply_quick_cleaning_action(df, req.action, req.column)
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=updated,
        change_summary=message
    )
    return {"status": "success", "message": message, "dataset": record}

@app.get("/api/datasets/{dataset_id}/editor/versions")
def get_versions_endpoint(dataset_id: str):
    return get_dataset_versions(dataset_id)

@app.post("/api/datasets/{dataset_id}/editor/versions/{version_number}/restore")
def restore_version_endpoint(dataset_id: str, version_number: int):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    ver = get_dataset_version(dataset_id, version_number)
    if not ver or not os.path.exists(ver["file_path"]):
        raise HTTPException(status_code=404, detail=f"Version {version_number} archive not found.")
    
    restored_df = pd.read_csv(ver["file_path"])
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=restored_df,
        change_summary=f"Restored to Version #{version_number} ({ver['change_summary']})"
    )
    return {"status": "success", "restored_version": version_number, "dataset": record}

@app.post("/api/datasets/{dataset_id}/editor/restore-original")
def restore_original_endpoint(dataset_id: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    orig_path = ds.get("original_file_path") or ds["file_path"]
    if not os.path.exists(orig_path):
        raise HTTPException(status_code=404, detail="Original upload file is missing.")
    
    ext = os.path.splitext(orig_path)[1].lower()
    if ext == ".csv":
        df = pd.read_csv(orig_path)
    elif ext in [".xlsx", ".xls"]:
        df = pd.read_excel(orig_path)
    elif ext == ".json":
        df = pd.read_json(orig_path)
    else:
        df = pd.read_csv(orig_path, on_bad_lines="skip")
        
    record = recalculate_and_persist_dataset(
        dataset_id=dataset_id,
        df=df,
        change_summary="Restored to Initial Original Upload"
    )
    return {"status": "success", "dataset": record}

class ChatRequest(BaseModel):
    message: str

@app.post("/api/datasets/{dataset_id}/chat")
def chat_with_data(dataset_id: str, req: ChatRequest):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    df = get_df_for_dataset(dataset_id)
    schema_profile = ds["schema"]
    stats = ds["summary"].get("stats", {})
    
    # Save user message
    save_chat_message(dataset_id, "user", req.message)
    
    # Generate response
    reply = ask_data_chat(
        query=req.message,
        df=df,
        schema_profile=schema_profile,
        stats=stats,
        provider_type=settings.AI_PROVIDER,
        api_key=settings.GEMINI_API_KEY
    )
    
    # Save assistant response
    save_chat_message(dataset_id, "assistant", reply["text"], reply.get("chart_data"))
    return reply

@app.get("/api/datasets/{dataset_id}/chat")
def get_dataset_chat(dataset_id: str):
    return get_chat_history(dataset_id)

class RunRecommendationRequest(BaseModel):
    spec: Dict[str, Any]

@app.post("/api/datasets/{dataset_id}/recommendation/run")
def run_rec(dataset_id: str, req: RunRecommendationRequest):
    df = get_df_for_dataset(dataset_id)
    res = execute_recommendation(df, req.spec)
    return res

class FilterRequest(BaseModel):
    search: Optional[str] = None
    sort_column: Optional[str] = None
    sort_ascending: bool = True
    page: int = 1
    page_size: int = 20
    column_filters: Optional[Dict[str, Any]] = None  # col -> {type: "range|category|contains", value: ...}

@app.post("/api/datasets/{dataset_id}/filter")
def filter_and_explore(dataset_id: str, req: FilterRequest):
    df = get_df_for_dataset(dataset_id)
    filtered = df.copy()

    # Apply global search
    if req.search and req.search.strip():
        search_term = req.search.strip().lower()
        # string match across all string columns
        mask = filtered.astype(str).apply(lambda row: row.str.lower().str.contains(search_term, regex=False)).any(axis=1)
        filtered = filtered[mask]

    # Apply column specific filters
    if req.column_filters:
        for col, flt in req.column_filters.items():
            if col in filtered.columns:
                f_type = flt.get("type")
                if f_type == "range":
                    min_val = flt.get("min")
                    max_val = flt.get("max")
                    col_num = pd.to_numeric(filtered[col], errors='coerce')
                    if min_val is not None:
                        filtered = filtered[col_num >= float(min_val)]
                    if max_val is not None:
                        filtered = filtered[col_num <= float(max_val)]
                elif f_type == "category":
                    selected = flt.get("selected", [])
                    if selected:
                        filtered = filtered[filtered[col].astype(str).isin([str(s) for s in selected])]
                elif f_type == "contains":
                    val = flt.get("value", "")
                    if val:
                        filtered = filtered[filtered[col].astype(str).str.contains(val, case=False, na=False)]

    # Sorting
    if req.sort_column and req.sort_column in filtered.columns:
        filtered = filtered.sort_values(by=req.sort_column, ascending=req.sort_ascending)

    total_filtered_rows = len(filtered)
    start_idx = (req.page - 1) * req.page_size
    end_idx = start_idx + req.page_size
    page_records = filtered.iloc[start_idx:end_idx].replace({float('nan'): None}).to_dict(orient="records")

    return {
        "total_rows": len(df),
        "filtered_rows": total_filtered_rows,
        "page": req.page,
        "page_size": req.page_size,
        "total_pages": max(1, (total_filtered_rows + req.page_size - 1) // req.page_size),
        "columns": list(df.columns),
        "rows": page_records
    }

@app.get("/api/datasets/{dataset_id}/export/{format}")
def export_dataset(dataset_id: str, format: str):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    df = get_df_for_dataset(dataset_id)

    if format == "csv":
        csv_bytes = export_to_safe_csv(df)
        return Response(
            content=csv_bytes,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={ds['name'].replace(' ', '_')}.csv"}
        )
    elif format == "xlsx":
        xlsx_bytes = export_to_excel(df, sheet_title=ds["name"])
        return Response(
            content=xlsx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={ds['name'].replace(' ', '_')}.xlsx"}
        )
    elif format == "pdf":
        pdf_bytes = generate_pdf_report(
            dataset_name=ds["name"],
            schema_profile=ds["schema"],
            stats=ds["summary"].get("stats", {}),
            insights=ds["summary"].get("insights", []),
            recommendations=ds["summary"].get("recommendations", [])
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={ds['name'].replace(' ', '_')}_Report.pdf"}
        )
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported export format '{format}'. Use csv, xlsx, or pdf.")

class ShareRequest(BaseModel):
    is_shared: bool

@app.post("/api/datasets/{dataset_id}/share")
def share_dataset_link(dataset_id: str, req: ShareRequest):
    ds = get_dataset(dataset_id)
    if not ds:
        raise HTTPException(status_code=404, detail="Dataset not found.")
    
    token = ds.get("share_token")
    if req.is_shared and not token:
        token = uuid.uuid4().hex[:16]
    elif not req.is_shared:
        token = None

    update_share_status(dataset_id, req.is_shared, token)
    return {
        "is_shared": req.is_shared,
        "share_token": token,
        "share_url": f"/shared/{token}" if token else None
    }

@app.get("/api/shared/{token}")
def get_shared_dashboard(token: str):
    ds = get_dataset_by_share_token(token)
    if not ds:
        raise HTTPException(status_code=404, detail="Shared dashboard not found or link has been revoked.")
    
    # Return read-only representation (protects source file path and internal metadata)
    return {
        "id": ds["id"],
        "name": ds["name"],
        "filename": ds["filename"],
        "source_type": ds["source_type"],
        "row_count": ds["row_count"],
        "col_count": ds["col_count"],
        "schema": ds["schema"],
        "quality": ds["quality"],
        "summary": ds["summary"],
        "created_at": ds["created_at"],
        "is_read_only": True
    }

class SettingsUpdate(BaseModel):
    ai_provider: Optional[str] = None
    gemini_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None

@app.get("/api/settings")
def get_current_settings():
    return {
        "ai_provider": settings.AI_PROVIDER,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "max_file_size_mb": settings.MAX_FILE_SIZE_MB,
        "max_rows_limit": settings.MAX_ROWS_LIMIT
    }

@app.post("/api/settings")
def update_settings(update: SettingsUpdate):
    if update.ai_provider:
        settings.AI_PROVIDER = update.ai_provider
    if update.gemini_api_key is not None:
        settings.GEMINI_API_KEY = update.gemini_api_key.strip()
    if update.openai_api_key is not None:
        settings.OPENAI_API_KEY = update.openai_api_key.strip()

    return {
        "status": "updated",
        "ai_provider": settings.AI_PROVIDER,
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "openai_configured": bool(settings.OPENAI_API_KEY)
    }

# Mount static frontend build if present
from fastapi.staticfiles import StaticFiles
from pathlib import Path

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Do not catch /api calls
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        target = FRONTEND_DIST / full_path
        if target.exists() and target.is_file():
            return FileResponse(str(target))
        return FileResponse(str(FRONTEND_DIST / "index.html"))

