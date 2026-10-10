from dataclasses import dataclass, field
from typing import Optional, List, Dict, Any
import pandas as pd

@dataclass
class ParsedData:
    df: Optional[pd.DataFrame] = None
    text_content: Optional[str] = None
    sheets: List[str] = field(default_factory=list)
    active_sheet: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_structured: bool = True
