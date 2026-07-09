import os
import re
import json
from typing import Dict, List, Tuple, Any, Optional

# In-memory backup database in case JSON load fails
DEFAULT_SKILLS_DB = {
  "Attendance and Leave Management": {
    "aliases": [
      "attendance and leave management",
      "attendance management",
      "leave management",
      "attendance and leave records",
      "attendance records",
      "leave records",
      "attendance tracking",
      "leave tracking"
    ],
    "category": "hr_operations"
  },
  "Communication Skills": {
    "aliases": [
      "communication skills",
      "communication",
      "candidate communication",
      "employee communication",
      "stakeholder communication",
      "client communication",
      "verbal communication",
      "written communication"
    ],
    "category": "soft_skill"
  },
  "Compliance": {
    "aliases": [
      "compliance",
      "policy compliance",
      "hr compliance",
      "labor law compliance",
      "labour law compliance",
      "statutory compliance",
      "employment law"
    ],
    "category": "hr_operations"
  },
  "Git": {
    "aliases": [
      "git",
      "github",
      "version control"
    ],
    "category": "software_technical"
  },
  "Salesforce": {
    "aliases": [
      "salesforce",
      "salesforce crm",
      "sf crm"
    ],
    "category": "sales"
  },
  "LinkedIn Recruiter": {
    "aliases": [
      "linkedin recruiter",
      "linkedin talent"
    ],
    "category": "hr_operations"
  },
  "MS Excel": {
    "aliases": [
      "ms excel",
      "microsoft excel",
      "excel"
    ],
    "category": "general"
  },
  "Confidentiality": {
    "aliases": [
      "confidentiality",
      "confidential"
    ],
    "category": "soft_skill"
  },
  "Employee Onboarding": {
    "aliases": [
      "employee onboarding",
      "onboarding"
    ],
    "category": "hr_operations"
  },
  "HR Documentation": {
    "aliases": [
      "hr documentation",
      "documentation"
    ],
    "category": "hr_operations"
  }
}

# Related evidence rules mapping
RELATED_TERMS = {
    "Salesforce": ["zoho crm", "hubspot", "crm", "pipedrive", "dynamics crm"],
    "Communication Skills": ["candidate coordination", "interview coordination", "candidate handling"],
    "Git": ["svn", "mercurial", "bitbucket", "gitlab"],
    "Attendance and Leave Management": ["attendance sheet", "leave records", "attendance records"],
    "Compliance": ["hr policies", "statutory", "labor laws", "labour laws"]
}

class SkillMatcher:
    def __init__(self):
        self.skills_db = DEFAULT_SKILLS_DB
        self.load_taxonomy()

    def load_taxonomy(self):
        dir_path = os.path.dirname(os.path.realpath(__file__))
        json_path = os.path.join(dir_path, "data", "skills.json")
        if os.path.exists(json_path):
            try:
                with open(json_path, "r") as f:
                    self.skills_db = json.load(f)
            except Exception as e:
                print(f"[SkillMatcher] Failed to read skills.json: {e}")

    def normalize_text(self, text: str) -> str:
        """Lowercase, remove special punctuation, normalize whitespace and plurals."""
        if not text:
            return ""
        text = text.lower()
        # Replace hyphens, slashes, underscores and common punctuation with space
        text = re.sub(r'[^a-z0-9\s#+\-\.]', ' ', text)
        text = text.replace('/', ' ').replace('_', ' ').replace('-', ' ')
        # Normalize repeated spaces
        text = ' '.join(text.split())
        return text

    def clean_plural(self, word: str) -> str:
        """Helper to stem basic English plurals safely for exact boundary checks."""
        # Simple plural check: e.g. "records" -> "record", "skills" -> "skill"
        if word.endswith('s') and not word.endswith('ss') and len(word) > 3:
            if word.endswith('ies'):
                return word[:-3] + 'y'
            return word[:-1]
        return word

    def is_phrase_in_text(self, phrase: str, normalized_text: str) -> bool:
        """Check if phrase matches in text with strict word boundaries to avoid false positives."""
        norm_phrase = self.normalize_text(phrase)
        if not norm_phrase:
            return False

        # Build word boundary regex pattern
        # Escape special characters like + or # (e.g. C++, C#)
        pattern_parts = []
        for word in norm_phrase.split():
            stemmed = self.clean_plural(word)
            if word != stemmed:
                pattern_parts.append(rf"{re.escape(stemmed)}s?")
            else:
                pattern_parts.append(re.escape(word))
        
        pattern = r'\b' + r'\s+'.join(pattern_parts) + r'\b'
        
        # Specific anti-false positive checks
        if norm_phrase == "git" and re.search(r'\bdigital\b', normalized_text):
            # Ensure "digital" doesn't match "git"
            matches = re.finditer(pattern, normalized_text)
            for m in matches:
                start, end = m.span()
                # Check if "git" is just a substring of "digital"
                if start > 0 and normalized_text[start-4:end] == "digital":
                    continue
                return True
            return False

        return bool(re.search(pattern, normalized_text))

    def evaluate_skill(self, jd_skill: str, normalized_resume: str) -> Tuple[str, Optional[Dict[str, Any]]]:
        """
        Evaluate if a skill in JD matches the resume.
        Returns: (match_status, related_evidence_obj)
        match_status can be: "DIRECT_MATCH", "RELATED_EVIDENCE", "NOT_EVIDENCED"
        """
        # Find entry in taxonomy
        norm_jd_skill = jd_skill.lower().strip()
        matched_canonical = None
        
        # Check canonical match first
        for canonical, info in self.skills_db.items():
            if canonical.lower() == norm_jd_skill:
                matched_canonical = canonical
                break

        if not matched_canonical:
            # Check if it matches an alias of any canonical skill
            for canonical, info in self.skills_db.items():
                if any(alias.lower() == norm_jd_skill for alias in info.get("aliases", [])):
                    matched_canonical = canonical
                    break

        # 1. Evaluate Direct Matches (Exact canonical or any defined alias)
        if matched_canonical:
            aliases = self.skills_db[matched_canonical].get("aliases", [])
            # Always check canonical name itself as an alias too
            all_aliases = list(set([matched_canonical.lower()] + [a.lower() for a in aliases]))
            
            for alias in all_aliases:
                if self.is_phrase_in_text(alias, normalized_resume):
                    return "DIRECT_MATCH", None

        # 2. Check general phrase matching directly against jd_skill name if not in DB
        if self.is_phrase_in_text(jd_skill, normalized_resume):
            return "DIRECT_MATCH", None

        # 3. Evaluate Related Evidence (Semantic or domain-specific)
        related_candidates = RELATED_TERMS.get(jd_skill, [])
        # Also check aliases of canonical skill as potential related terms if direct check was strict
        if matched_canonical and not related_candidates:
            # Let's see if we can identify specific related terms
            pass

        for term in related_candidates:
            if self.is_phrase_in_text(term, normalized_resume):
                evidence_text = term.title()
                return "RELATED_EVIDENCE", {
                    "jobSkill": jd_skill,
                    "resumeEvidence": evidence_text,
                    "confidence": "high",
                    "message": "Related evidence found in the resume; review before adding as a confirmed skill."
                }

        return "NOT_EVIDENCED", None

    def classify_requirement_importance(self, skill: str, jd_text: str) -> str:
        """Classify if a JD requirement is REQUIRED, PREFERRED, or OPTIONAL based on JD context."""
        skill_clean = self.normalize_text(skill)
        jd_norm = self.normalize_text(jd_text)
        
        if not skill_clean or not jd_norm:
            return "OPTIONAL"

        idx = jd_norm.find(skill_clean)
        if idx == -1:
            return "OPTIONAL"

        # Look in the surrounding text context window (150 chars before skill mention)
        start_idx = max(0, idx - 150)
        context = jd_norm[start_idx:idx]

        required_indicators = ["required", "must have", "minimum", "qualification", "qualifications", "essential", "have to", "mandatory", "requirements"]
        preferred_indicators = ["preferred", "nice to have", "plus", "desired", "beneficial", "recommended", "bonus", "optional", "strongly preferred", "ideally"]

        if any(indicator in context for indicator in required_indicators):
            return "REQUIRED"
        if any(indicator in context for indicator in preferred_indicators):
            return "PREFERRED"
        
        return "OPTIONAL"
