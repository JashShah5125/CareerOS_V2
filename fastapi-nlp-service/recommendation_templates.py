from typing import List, Dict, Tuple

DOMAINS = {
    "software_technical": ["developer", "engineer", "programmer", "coding", "frontend", "backend", "fullstack", "devops", "architect", "data engineer"],
    "hr_people_operations": ["hr", "human resources", "talent", "recruiting", "recruiter", "payroll", "hris", "onboarding", "people operations", "personnel"],
    "sales": ["sales", "revenue", "account executive", "business development", "crm", "salesforce", "pipeline", "client acquisition", "sales manager"],
    "business_analytics": ["business analyst", "pm", "product manager", "product owner", "scrum master", "requirements analyst"],
    "data_analytics": ["data analyst", "data scientist", "bi analyst", "analytics", "machine learning", "ml"],
    "marketing": ["marketing", "seo", "sem", "branding", "growth", "campaign", "social media"],
    "finance": ["finance", "accounting", "accountant", "audit", "tax", "treasury", "ledger"],
    "operations": ["operations", "supply chain", "logistics", "procurement", "inventory", "vendor", "ops"],
    "design": ["design", "designer", "ui", "ux", "figma", "sketch", "photoshop", "illustrator"],
    "general": []
}

def detect_job_domain(job_title: str, job_description: str) -> str:
    combined = (job_title + " " + job_description).lower()
    # Check specific domains first
    for domain in ["software_technical", "hr_people_operations", "sales", "business_analytics", "data_analytics", "marketing", "finance", "operations", "design"]:
        keywords = DOMAINS[domain]
        if any(kw in combined for kw in keywords):
            return domain
    return "general"

def get_domain_bullets(missing_skills: List[str], matched_skills: List[str], domain: str) -> List[Dict]:
    bullets = []
    
    if not missing_skills:
        # Standard fallback if all skills are matched
        matched_str = ", ".join(matched_skills[:3]) if matched_skills else "your core skills"
        bullets.append({
            "section": "Action Recommendation",
            "originalContext": "No major skills gaps identified",
            "suggestedBullet": f"Incorporate metrics, sizes, and outcomes for your existing project stacks (e.g. {matched_str}) to highlight your impact."
        })
        return bullets

    # HR domain suggestions
    if domain == "hr_people_operations":
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            if "attendance" in kw.lower() or "leave" in kw.lower():
                bullet = "If you have handled attendance or leave records, add a bullet specifying the number of employees supported and the HR systems used."
            elif "compliance" in kw.lower() or "policy" in kw.lower():
                bullet = "If you have supported compliance activities, mention policy documentation, employee records, audits, statutory processes, or confidentiality responsibilities."
            elif "hris" in kw.lower() or "system" in kw.lower() or "workday" in kw.lower() or "zimyo" in kw.lower():
                bullet = "If you have used an HRIS or HRMS, name the specific system and describe the employee onboarding or record workflow you managed."
            else:
                bullet = f"Describe an instance where you supported {kw_cap} and outline your specific responsibilities and achievements."
            bullets.append({
                "section": "Suggested HR Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": bullet
            })
            
    # Sales domain suggestions
    elif domain == "sales":
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            bullets.append({
                "section": "Suggested Sales Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": f"Add measurable evidence such as leads generated, conversion rate, revenue influenced, meetings booked, or specific CRM tools used while applying {kw_cap}."
            })
            
    # Business Analytics / Product Management suggestions
    elif domain == "business_analytics":
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            bullets.append({
                "section": "Suggested Business Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": f"Add evidence of requirements gathering, stakeholder communication, metric dashboards, reports, process improvements, or measurable business outcomes for {kw_cap}."
            })
            
    # Marketing suggestions
    elif domain == "marketing":
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            bullets.append({
                "section": "Suggested Marketing Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": f"Add campaign metrics such as reach, CTR, conversions, engagement, budget managed, or specific marketing tools used during your {kw_cap} execution."
            })

    # Software / Technical suggestions
    elif domain == "software_technical" or domain == "data_analytics":
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            if "route" in kw.lower() or "api" in kw.lower():
                bullet = f"If you have experience with {kw_cap}: Describe a project where you built routing or API endpoint integrations. If not, recommend setting up a basic application using {kw_cap}."
            else:
                bullet = f"Add evidence through projects, features, APIs, databases, tests, deployments, performance improvements, or GitHub links related to {kw_cap}."
            bullets.append({
                "section": "Suggested Technical Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": bullet
            })
            
    # General / Operations / Design / Finance suggestions
    else:
        for kw in missing_skills[:2]:
            kw_cap = kw.capitalize()
            bullets.append({
                "section": "Suggested Action",
                "originalContext": f"Skill '{kw_cap}' not yet directly evidenced",
                "suggestedBullet": f"Outline a past experience, task, or deliverable where you utilized {kw_cap}, including the tool and the quantifiable result of your action."
            })
            
    return bullets
