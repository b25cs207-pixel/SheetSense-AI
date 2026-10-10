import re
from typing import Optional, Dict, Any, List, Tuple
from collections import Counter
import pandas as pd

def structure_text_content(text: str, filename: str = "document") -> (Optional[pd.DataFrame], List[str], Dict[str, Any]):
    """
    Intelligently converts unstructured or semi-structured document/image text
    into a structured analytical DataFrame.
    """
    clean_text = text.strip()
    if not clean_text:
        return None, ["The document contains no readable text or numerical data."], {}

    lines = [l.strip() for l in clean_text.split("\n") if l.strip()]
    metadata: Dict[str, Any] = {
        "source_filename": filename,
        "line_count": len(lines),
        "char_count": len(clean_text)
    }
    warnings: List[str] = []

    # 1. Detect common units
    unit = "Units"
    lower_text = clean_text.lower()
    if 'mm' in lower_text or '"mm"' in lower_text:
        unit = "mm"
    elif 'cm' in lower_text:
        unit = "cm"
    elif 'kg' in lower_text:
        unit = "kg"
    elif '$' in clean_text or 'usd' in lower_text:
        unit = "USD"
    elif '%' in clean_text or 'percent' in lower_text:
        unit = "%"

    # 2. Extract Key-Value Pairs
    kv_pairs = []
    # Try finding patterns like KEY: VALUE or KEY - VALUE
    for line in lines:
        if ":" in line:
            parts = line.split(":", 1)
            k, v = parts[0].strip(), parts[1].strip()
            if k and v and len(k) < 40:
                kv_pairs.append((k, v))
        elif "=" in line:
            parts = line.split("=", 1)
            k, v = parts[0].strip(), parts[1].strip()
            if k and v and len(k) < 40:
                kv_pairs.append((k, v))

    # Detect parallel header/value blocks (like in title blocks: TOPIC, NAME, ROLLNO, DATE)
    headers_detected = []
    values_detected = []
    common_title_keys = {"topic", "name", "rollno", "roll no", "roll_no", "date", "dept", "department", "subject", "title", "author"}
    
    for idx, l in enumerate(lines):
        if l.lower() in common_title_keys:
            headers_detected.append((idx, l))

    if len(headers_detected) >= 2:
        # Check if following lines match values
        first_h_idx = headers_detected[0][0]
        last_h_idx = headers_detected[-1][0]
        h_count = len(headers_detected)
        val_start = last_h_idx + 1
        if val_start + h_count <= len(lines):
            potential_vals = lines[val_start:val_start + h_count]
            for (h_idx, h_name), v in zip(headers_detected, potential_vals):
                kv_pairs.append((h_name.upper(), v))

    # 3. Extract Numerical Dimensions, Coordinates, or Quantities
    # Look for all numbers (floats, ints)
    number_tokens = []
    for line_idx, line in enumerate(lines):
        matches = re.finditer(r'\b(?<![a-zA-Z_])(\d+(?:\.\d+)?)(?![a-zA-Z_])\b', line)
        for m in matches:
            val_str = m.group(1)
            # Exclude 4-digit years like 2026 if part of date
            if len(val_str) == 4 and val_str.startswith("202") and "date" in lower_text:
                continue
            # Context around the number
            start_pos = max(0, m.start() - 15)
            end_pos = min(len(line), m.end() + 15)
            context = line[start_pos:end_pos].strip()
            number_tokens.append({
                "value": float(val_str),
                "context": context,
                "line": line_idx + 1
            })

    # Strategy A: If we found numerical measurements (e.g. CAD drawing, lab data, invoice items)
    if len(number_tokens) >= 2:
        meas_rows = []
        for i, item in enumerate(number_tokens):
            meas_rows.append({
                "Measurement_ID": f"M-{i+1:02d}",
                "Parameter_or_Item": f"Dimension / Value {i+1}",
                "Value": item["value"],
                "Unit": unit,
                "Context": item["context"] or f"Line {item['line']}"
            })
        df = pd.DataFrame(meas_rows)
        warnings.append(f"Document analyzed: Extracted {len(df)} measurements & dimensions into structured records.")
        metadata["reconstructed_type"] = "measurements_and_dimensions"
        return df, warnings, metadata

    # Strategy B: If Key-Value pairs found
    if len(kv_pairs) >= 2:
        kv_rows = []
        for k, v in kv_pairs:
            # Check if numeric
            val_num = None
            try:
                val_num = float(re.sub(r'[^\d.-]', '', v))
            except Exception:
                val_num = None
            kv_rows.append({
                "Attribute": k.title(),
                "Text_Value": v,
                "Numeric_Value": val_num if val_num is not None else 0.0,
                "Has_Number": "Yes" if val_num is not None else "No"
            })
        df = pd.DataFrame(kv_rows)
        warnings.append(f"Document analyzed: Reconstructed {len(df)} attribute/value records from document metadata.")
        metadata["reconstructed_type"] = "key_value_attributes"
        return df, warnings, metadata

    # Strategy C: Text Document Lines Structure
    if len(lines) >= 2:
        line_rows = []
        for i, l in enumerate(lines[:100]):
            words = [w for w in l.split() if w.strip()]
            nums = re.findall(r'\d+(?:\.\d+)?', l)
            line_rows.append({
                "Line_Number": i + 1,
                "Line_Content": l[:60],
                "Word_Count": len(words),
                "Character_Count": len(l),
                "Numbers_Count": len(nums)
            })
        df = pd.DataFrame(line_rows)
        warnings.append(f"Document structured: Indexed {len(df)} lines and section metrics.")
        metadata["reconstructed_type"] = "text_structure_index"
        return df, warnings, metadata

    return None, ["Document could not be transformed into structured data."], metadata
