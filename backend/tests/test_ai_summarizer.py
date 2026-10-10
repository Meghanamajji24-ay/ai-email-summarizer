import pytest
from app.services.ai_summarizer import ai_service

def test_smart_nlp_extractor():
    sample_text = """
    Hi Alex,

    We need you to submit the final engineering design review by Friday at 5:00 PM.
    Please review the attached system architecture document carefully.
    We agreed to approve the cloud infrastructure migration budget of $15,000.
    Action required: finalize the OAuth 2.0 PKCE implementation before release.

    Thanks,
    Sarah
    """

    res = ai_service._smart_nlp_summarize(
        subject="Urgent: Architecture Review & Budget Approval",
        sender="Sarah Chen",
        text=sample_text,
        summary_length="standard"
    )

    assert "summary" in res
    assert len(res["summary"]) > 20
    assert res["priority"] in ["high", "medium", "low"]
    assert len(res["action_items"]) > 0
    assert any("friday" in str(d).lower() or "pm" in str(d).lower() for d in res.get("important_dates", []))
    assert res["suggested_reply"] is not None
