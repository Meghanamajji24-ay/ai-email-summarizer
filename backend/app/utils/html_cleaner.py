import re
from bs4 import BeautifulSoup

def clean_html_for_preview(html_content: str) -> str:
    """Sanitizes HTML content by stripping dangerous tags and scripts, preserving formatting."""
    if not html_content:
        return ""
    
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove potentially dangerous tags
    for tag in soup(["script", "style", "iframe", "object", "embed", "applet", "meta", "link", "form", "input", "button"]):
        tag.decompose()
        
    # Clean inline javascript handlers (onclick, onload, etc.)
    for tag in soup.find_all(True):
        attrs = dict(tag.attrs)
        for attr in attrs:
            if attr.lower().startswith("on") or "javascript:" in str(attrs[attr]).lower():
                del tag.attrs[attr]
                
    return str(soup)

def html_to_plain_text(html_content: str) -> str:
    """Extracts clean plain text from HTML email body for AI ingestion."""
    if not html_content:
        return ""
    
    soup = BeautifulSoup(html_content, "html.parser")
    
    # Remove script and style elements
    for script in soup(["script", "style", "head", "title", "meta", "[document]"]):
        script.extract()
        
    text = soup.get_text(separator="\n")
    
    # Break into lines and remove leading and trailing space on each
    lines = [line.strip() for line in text.splitlines()]
    # Break multi-headlines into a line each
    chunks = [phrase.strip() for line in lines for phrase in line.split("  ")]
    # Drop blank lines
    text = '\n'.join(chunk for chunk in chunks if chunk)
    return text

def truncate_text(text: str, max_chars: int = 12000) -> str:
    """Truncates text safely to avoid exceeding LLM context boundaries while retaining key sections."""
    if len(text) <= max_chars:
        return text
    half = max_chars // 2
    return text[:half] + "\n\n[... Email body truncated for summarization ...]\n\n" + text[-half:]
