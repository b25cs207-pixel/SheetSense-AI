import ipaddress
import socket
from urllib.parse import urlparse
import requests
import io
import pandas as pd
from backend.parsers.base import ParsedData
from backend.parsers.csv_parser import parse_csv
from backend.parsers.excel_parser import parse_excel
from backend.parsers.json_parser import parse_json
from backend.parsers.pdf_parser import parse_pdf

def is_safe_url(url: str) -> (bool, str):
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https"]:
            return False, f"Unsupported URL scheme: {parsed.scheme}. Only HTTP and HTTPS are permitted."

        hostname = parsed.hostname
        if not hostname:
            return False, "Invalid URL: missing hostname."

        # Reject loopback and obvious internal names
        if hostname.lower() in ["localhost", "127.0.0.1", "0.0.0.0", "::1", "local"]:
            return False, "Access to localhost and internal hostnames is prohibited (SSRF Protection)."

        # Resolve IP to verify non-private
        try:
            addr_info = socket.getaddrinfo(hostname, None)
            for item in addr_info:
                ip_str = item[4][0]
                ip_obj = ipaddress.ip_address(ip_str)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_reserved or ip_obj.is_link_local:
                    return False, f"Target resolves to a private or reserved network IP address ({ip_str}). Request blocked for security."
        except socket.gaierror:
            return False, f"Could not resolve host '{hostname}'."

        return True, ""
    except Exception as e:
        return False, f"URL validation error: {str(e)}"

def parse_url(url: str) -> ParsedData:
    is_safe, error_msg = is_safe_url(url)
    if not is_safe:
        return ParsedData(
            df=None,
            warnings=[f"Security validation blocked this URL: {error_msg}"],
            is_structured=False
        )

    headers = {
        "User-Agent": "SheetSense-Data-Bot/1.0 (Mozilla/5.0 compatible)"
    }
    try:
        response = requests.get(url, headers=headers, timeout=12, allow_redirects=True, stream=True)
        response.raise_for_status()

        # Check final redirected URL for SSRF as well
        safe_final, final_msg = is_safe_url(response.url)
        if not safe_final:
            return ParsedData(
                df=None,
                warnings=[f"Redirect blocked by security policy: {final_msg}"],
                is_structured=False
            )

        content_type = response.headers.get("Content-Type", "").lower()
        content_bytes = response.content
        path = urlparse(response.url).path.lower()

        # Route based on content type or filename extension
        if "csv" in content_type or path.endswith(".csv"):
            return parse_csv(content_bytes, filename=path.split("/")[-1] or "remote.csv")
        elif "excel" in content_type or "spreadsheet" in content_type or path.endswith((".xlsx", ".xls")):
            return parse_excel(content_bytes, filename=path.split("/")[-1] or "remote.xlsx")
        elif "json" in content_type or path.endswith(".json"):
            return parse_json(content_bytes, filename=path.split("/")[-1] or "remote.json")
        elif "pdf" in content_type or path.endswith(".pdf"):
            return parse_pdf(content_bytes, filename=path.split("/")[-1] or "remote.pdf")
        elif "text/html" in content_type:
            # Try reading HTML tables
            try:
                tables = pd.read_html(io.StringIO(response.text))
                if tables and len(tables) > 0:
                    # Pick the largest table
                    best_df = max(tables, key=lambda t: t.shape[0] * t.shape[1])
                    if best_df.shape[0] >= 2 and best_df.shape[1] >= 2:
                        best_df.columns = [str(c).strip() for c in best_df.columns]
                        return ParsedData(
                            df=best_df,
                            metadata={"tables_found_on_page": len(tables), "source_url": url},
                            is_structured=True
                        )
            except Exception:
                pass
            
            # If no HTML table parsed, structure the webpage text
            import re
            cleaned_text = re.sub(r'<[^>]+>', ' ', response.text)
            cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()

            from backend.parsers.document_structurer import structure_text_content
            df_struct, struct_warnings, struct_meta = structure_text_content(cleaned_text, url)
            if df_struct is not None:
                struct_meta["source_url"] = url
                return ParsedData(
                    df=df_struct,
                    text_content=cleaned_text[:4000],
                    metadata=struct_meta,
                    warnings=struct_warnings,
                    is_structured=True
                )

            return ParsedData(
                df=None,
                text_content=cleaned_text[:4000],
                metadata={"source_url": url},
                warnings=["Webpage fetched. No HTML data table found."],
                is_structured=False
            )

        # Default fallback: try CSV
        return parse_csv(content_bytes, filename="remote.csv")

    except requests.RequestException as e:
        return ParsedData(
            df=None,
            warnings=[f"Failed to fetch URL ({url}): {str(e)}"],
            is_structured=False
        )
