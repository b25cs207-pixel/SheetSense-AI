# SheetSense AI 🧠📊
**Universal AI-Powered Data Analysis, Spreadsheet Editing, Visualization & Dashboard Platform**

SheetSense AI is a complete, production-grade universal analytics and spreadsheet intelligence platform. It eliminates the manual burden of data profiling, formula authoring, chart selection, and business reporting. Upload multi-modal files (CSV, Excel multi-sheet, JSON, CAD/drawing PDFs, Word, images/OCR, or web links), and SheetSense AI instantly detects schemas, performs deterministic computations, synthesizes interactive visualizations, derives domain-specific AI insights, enables in-browser spreadsheet editing with formula recalculation and version rollback, and delivers actionable recommendations.

---

## 🌟 Key Features

### 1. Multi-Modal Ingestion & Document Structurer
- **Structured Data**: CSV (auto-delimiter sniff `,`, `\t`, `;`, `|`, auto-encoding `utf-8`, `latin-1`), Excel (`.xlsx`, `.xls` with multi-sheet detection and sheet switching), and JSON (arrays of records or nested objects).
- **Documents & Technical Blueprints**: PDF text & embedded table reconstruction, Word (`.docx`) tables & paragraphs, and plain text (`.txt`).
- **CAD & Drawing Structurer**: Solves non-grid drawing extraction (e.g. `HEMANTH SOLIDS-Model.pdf`, `satwik-Model2 FIX.pdf`). Dimensions, tolerances, and title blocks are structured into DataFrames and visualized automatically with zero 400 errors.
- **Images & OCR**: PNG / JPEG optical text & tabular extraction.
- **Public Web URLs**: Safe remote fetching with strict **SSRF Defense** (blocking RFC 1918 private subnets, loopbacks, and redirect traps) with automatic HTML table extraction.
- **4 Built-In Benchmark Datasets**: 1-click loading for Sales Performance, Student Academic Performance, E-Commerce Orders, and Employee Attendance & HR Logs.

### 2. Universal Analysis Engine (3 Modes & 11 Domains)
- **Mode A: Automatic Analysis**:
  - Automatically inspects column titles, cardinalities, and value distributions to infer the domain and confidence score.
- **Mode B: Industry-Specific Workspaces (11 Domains)**:
  - **Business Intelligence & Sales**: Gross revenue, net profit, operating margin %, average ticket size, and top deal segments.
  - **Banking & Personal Finance**: Cash flow (deposits vs. debits), net volume, category spending, and largest transactions.
  - **Education & Student Performance**: Class averages, pass rates ($\ge 40$ benchmark), cohort distributions, and exam spreads.
  - **Accounting & Corporate Finance**: Invoice aging, receivables vs. payables, and ledger balances.
  - **Healthcare Administration**: Patient admissions, department loads, and wait times.
  - **Retail & Inventory**: Stock units, low-stock reorder alerts ($< 10$ units), and unit prices.
  - **Manufacturing & Production**: Total production, defect rates, scrap counts, and downtime hours.
  - **Logistics & Supply Chain**: Route delays, transit durations, and fleet deliveries.
  - **Human Resources**: Headcount by department, average hours, overtime logs, and payroll.
  - **Marketing & Advertising**: Ad spend, leads/conversions, Cost Per Acquisition (CPA), and CTR.
  - **Universal General Analytics**: Balanced, multi-attribute statistics.
- **Mode C: Custom Analysis Objective**:
  - Allows users to describe an analytical goal in natural language (e.g., *"Find underperforming sales reps and compare high-margin product categories"*). AI insights and charts adapt dynamically.

### 3. Advanced Spreadsheet Data Editor (Required Core MVP)
Available via the dedicated **Spreadsheet Editor** tab in the sidebar:
- **Click-to-Edit Grid**: Click any cell to modify values inline with keyboard navigation (`Enter` to commit, `Esc` to cancel). Modified cells are highlighted in amber with a live unsaved edit counter.
- **Safe Spreadsheet Formula Evaluation**:
  - Evaluates formulas like `=SUM(column)`, `=AVERAGE(column)`, and row-wise arithmetic (`=colA + colB`, `=colA * colB`, `=colA - colB`, `=colA / colB`) without executing unsafe Python `eval` or macros.
- **Data Mutations**:
  - **Add Row**: Appends new rows.
  - **Delete Rows**: Multi-row selection checkboxes with batch deletion.
  - **Add Column**: Specify column name, data type (Numeric, Text, Datetime), and default value.
  - **Rename Column & Delete Column**: Fast schema manipulation with validation.
  - **Find & Replace**: Global or column-specific text replacement with optional case matching.
  - **Quick Data Cleaning**: One-click actions for *Trim Whitespace*, *UPPERCASE*, *lowercase*, *Title Case*, and *Standardize Dates (YYYY-MM-DD)*.
- **Version History & Rollback**:
  - Every save creates an immutable version snapshot (`dataset_id_v{N}.csv`) in SQLite and filesystem storage.
  - **Version History Drawer**: Displays version numbers, timestamps, row/column counts, and change summaries with a **Restore** button for instant rollback.
  - **Reset to Original Upload**: Restores the pristine initial uploaded file with zero data loss.

### 4. Deterministic Statistical Engine & Quality Hygiene
- **No Hallucinated Numbers**: Sums, medians, means, variances, percentiles, category shares, and growth rates are computed strictly in Python with `pandas` and `numpy`.
- **Quality Index**: Completeness, duplicate count, missing cell percentage, and sample value previews.
- **Outlier Alerts**: Mathematical detection of anomalies outside the $1.5 \times \text{IQR}$ boundary.
- **Chronological Analysis**: Automatic timeline aggregation (daily, weekly, monthly), period-over-period delta, and growth trajectory.
- **Correlation Matrix**: Computes Pearson correlation coefficients ($r$) across numerical pairs.

### 5. Interactive Visualizations (Recharts)
- **Supported Visualizations**: Bar Charts, Horizontal Bar Charts, Donut / Pie Charts, Time-Series Area & Line Charts, Distribution Histograms, Scatter Plots, and Grouped Bar Charts.
- **Interactive Controls**: Dynamic chart-type switcher, sort ascending/descending, tooltip details, and plain-English key takeaway badges.

### 6. Evidence-Grounded AI Insights & "Ask Your Data"
- **Structured Cards**: Key Findings, Top Performers, Trends, Statistical Relationships, and Data Quality Alerts.
- **"Ask Your Data" Assistant**: Natural language query answering strictly grounded on verified facts with dynamic chart generation inside chat messages.
- **Proactive Recommendations**: Contextual suggestions with working "Run Analysis" buttons that execute real computations.

### 7. Privacy, Safety & Statistical Literacy
- **Financial Privacy Shield (`****1234`)**: Automatically identifies and masks sensitive account numbers, credit cards, and PII. Accessible via the topbar **Privacy Shield** modal.
- **Educational Concepts Explainer**: Explains *Mean vs. Median*, *Correlation vs. Causation*, *IQR Outlier Detection*, and *Chart Selection Literacy* in simple, intuitive terms.
- **Safe Export Engine**:
  - **Safe CSV**: Escapes spreadsheet formulas (`=`, `+`, `-`, `@`) to prevent CSV injection.
  - **Executive PDF Report**: Multi-page styled analytics report generated via `reportlab` with KPI cards, insights, and data hygiene audits.
  - **Excel Workbook (.xlsx)**: Auto-adjusted column widths and styled headers.
  - **Read-Only Public Sharing**: Creates access-controlled web links (`/#shared/<token>`) with 1-click revocation.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React |
| **Backend** | Python 3.14+, FastAPI, Starlette, Uvicorn, SQLite |
| **Data Engine** | pandas, NumPy, openpyxl, python-docx, pypdf, Pillow |
| **Reporting & Export** | ReportLab, OpenPyXL |
| **Testing** | Python `unittest`, FastAPI `TestClient`, httpx (20/20 Passing Tests) |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ (tested on Node.js 22 LTS)

### 1. Backend Setup
```bash
python -m pip install fastapi uvicorn python-multipart pydantic openpyxl pandas numpy requests reportlab pypdf pillow python-docx pytesseract httpx
```

### 2. Frontend Build
```bash
cd frontend
npm install
npm run build
cd ..
```

### 3. Run Application
Run the unified FastAPI server (which automatically serves the compiled React frontend at `/` and API at `/api`):
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
Open **`http://127.0.0.1:8000`** in your browser!

---

## 🧪 Automated Test Verification

All 20 unit and end-to-end integration test suites run and pass:
```bash
python -m unittest discover backend/tests
```

```
Ran 20 tests in 1.170s
OK
```

Test coverage includes:
- Multi-modal ingestion (CSV, Excel, CAD drawings, documents, URLs)
- Schema profiling & IQR anomaly detection
- Deterministic statistics & candidate charts
- Proactive recommendations & live execution
- Safe CSV formula injection escaping
- PDF & Excel report exports
- Shared read-only dashboards
- Domain intelligence & domain switching
- Educational concepts & financial data masking
- Spreadsheet editor cell edits & formula evaluation
- Row & column mutations (Add, Rename, Delete)
- Version history snapshotting, rollback, and original restore
