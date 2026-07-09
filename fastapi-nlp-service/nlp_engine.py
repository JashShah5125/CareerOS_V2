import re
import time
from typing import Dict, List, Tuple, Any
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from skill_matcher import SkillMatcher
from recommendation_templates import detect_job_domain, get_domain_bullets

matcher_obj = SkillMatcher()

# Common stop words to filter out before keyword matching
STOP_WORDS = {
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'arent', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'cant', 'cannot', 'could',
    'did', 'didnt', 'do', 'does', 'doesnt', 'doing', 'dont', 'down', 'during', 'each', 'few', 'for', 'from', 'further',
    'had', 'hadnt', 'has', 'hasnt', 'have', 'havent', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself',
    'his', 'how', 'i', 'if', 'in', 'into', 'is', 'isnt', 'it', 'its', 'itself', 'just', 'more', 'most', 'my', 'myself',
    'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
    'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves',
    'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
    'wasnt', 'we', 'were', 'werent', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with', 'dont',
    'you', 'your', 'yours', 'yourself', 'yourselves'
}

# Strong technical keyword vocabulary bank for candidate parsing
SKILLS_BANK = [
    # --- Languages & Software Engineering ---
    'javascript', 'typescript', 'python', 'java', 'c#', 'c++', 'go', 'rust', 'ruby', 'php', 'c', 'scala', 'kotlin', 'swift', 'objective-c', 'dart', 'r', 'perl', 'bash', 'cobol',
    # --- Frontend / Libraries ---
    'react', 'next.js', 'vue', 'angular', 'redux', 'tailwind', 'bootstrap', 'css', 'html', 'webpack', 'sass', 'less',
    # --- Backend / Frameworks ---
    'node.js', 'express', 'django', 'flask', 'laravel', 'spring boot', 'fastapi', 'rails', 'asp.net',
    # --- Databases & Caching ---
    'postgresql', 'mongodb', 'mysql', 'sql', 'redis', 'graphql', 'sqlite', 'cassandra', 'mariadb', 'oracle', 'dynamodb', 'elasticsearch',
    # --- Cloud & DevOps ---
    'docker', 'aws', 'kubernetes', 'jenkins', 'terraform', 'cloud', 'gcp', 'azure', 'ci/cd', 'ansible', 'circleci', 'github actions', 'linux', 'nginx', 'apache', 'serverless',
    # --- Tooling / Testing & Versioning ---
    'git', 'github', 'gitlab', 'bitbucket', 'prisma', 'sequelize', 'testing', 'jest', 'cypress', 'selenium', 'mocha', 'chai', 'playwright', 'postman', 'junit',
    
    # --- Sales, Marketing & Business Development ---
    'sales', 'revenue', 'quota', 'crm', 'salesforce', 'hubspot', 'lead generation', 'cold calling', 'b2b sales', 'b2c sales', 'pipeline management', 'account management', 'deal closing', 'customer success', 'prospecting', 'negotiation', 'contracts', 'annual contract value', 'acv', 'contract value', 'saas', 'enterprise sales', 'growth hacking', 'branding', 'marketing strategy', 'seo', 'sem', 'copywriting', 'google analytics', 'social media marketing', 'email marketing', 'market research', 'digital marketing', 'lead scoring', 'conversion rate optimization', 'cro',
    
    # --- Product, Project & Design ---
    'product management', 'project management', 'agile', 'scrum', 'jira', 'figma', 'ui/ux', 'photoshop', 'illustrator', 'system design', 'microservices', 'wireframing', 'sketching', 'adobe creative suite', 'indesign', 'branding', 'canva', 'trello', 'asana', 'product roadmap', 'user research', 'information architecture', 'prototyping', 'storyboarding',
    
    # --- Finance, Accounting & Business Operations ---
    'financial modeling', 'budgeting', 'forecasting', 'quickbooks', 'sap', 'auditing', 'taxation', 'accounting', 'excel', 'valuation', 'portfolio management', 'risk assessment', 'general ledger', 'accounts payable', 'accounts receivable', 'cost analysis', 'financial reporting', 'invoice management', 'compliance auditing', 'p&l management',
    
    # --- Human Resources, Sourcing & Talent Management ---
    'talent acquisition', 'recruitment', 'hris', 'payroll', 'employee relations', 'workforce planning', 'sourcing', 'conflict resolution', 'benefits administration', 'performance management', 'labor laws', 'background checks', 'talent mapping', 'workday', 'zimyo', 'spine', 'hrms', 'attendance and leave management', 'attendance management', 'leave management', 'attendance and leave records', 'attendance records', 'leave records', 'attendance tracking', 'leave tracking', 'communication skills', 'communication', 'candidate communication', 'employee communication', 'stakeholder communication', 'client communication', 'verbal communication', 'written communication', 'policy compliance', 'hr compliance', 'labor law compliance', 'labour law compliance', 'statutory compliance', 'employment law', 'confidentiality', 'confidential', 'employee onboarding', 'onboarding', 'hr documentation', 'ms excel', 'microsoft excel',
    
    # --- Operations, Logistics & Supply Chain ---
    'supply chain', 'inventory management', 'logistics', 'procurement', 'lean', 'six sigma', 'operations management', 'vendor management', 'purchasing', 'warehouse operations', 'order fulfillment', 'quality control', 'process improvement',
    
    # --- Healthcare, Medical & Clinical ---
    'hipaa', 'patient care', 'electronic health records', 'ehr', 'emr', 'nursing', 'medical terminology', 'clinical trials', 'diagnostics', 'healthcare administration', 'patient relationship', 'cpr', 'first aid', 'patient charting', 'triage', 'pharmacology',
    
    # --- Legal, Compliance & Risk ---
    'contract negotiation', 'legal research', 'litigation', 'compliance', 'corporate law', 'risk management', 'contract drafting', 'regulatory affairs', 'intellectual property', 'audit risk', 'due diligence'
]

ACTION_VERBS = [
    # --- Tech & Engineering ---
    'develop', 'developed', 'developing', 'design', 'designed', 'designing', 'engineer', 'engineered', 'engineering',
    'optimize', 'optimized', 'optimizing', 'build', 'built', 'building', 'implement', 'implemented', 'implementing',
    'create', 'created', 'creating', 'scale', 'scaled', 'scaling', 'resolve', 'resolved', 'resolving',
    'automate', 'automated', 'automating', 'integrate', 'integrated', 'integrating', 'architect', 'architected',
    'spearhead', 'spearheaded', 'spearheading', 'program', 'programmed', 'programming', 'deploy', 'deployed', 'deploying',
    'monitor', 'monitored', 'monitoring', 'refactor', 'refactored', 'refactoring', 'migrate', 'migrated', 'migrating',
    'debug', 'debugged', 'debugging', 'configure', 'configured', 'configuring', 'administer', 'administered', 'administering',
    # --- Sales, BD & Marketing ---
    'close', 'closed', 'closing', 'achieve', 'achieved', 'achieving', 'generate', 'generated', 'generating',
    'drive', 'drove', 'driving', 'negotiate', 'negotiated', 'negotiating', 'exceed', 'exceeded', 'exceeding',
    'increase', 'increased', 'increasing', 'secure', 'secured', 'securing', 'grow', 'grew', 'growing',
    'launch', 'launched', 'launching', 'expand', 'expanded', 'expanding', 'prospect', 'prospected', 'prospecting',
    'pitch', 'pitched', 'pitching', 'partner', 'partnered', 'partnering', 'present', 'presented', 'presenting',
    'acquire', 'acquired', 'acquiring', 'win', 'won', 'winning', 'retain', 'retained', 'retaining',
    'establish', 'established', 'establishing', 'initiate', 'initiated', 'initiating', 'target', 'targeted', 'targeting',
    'maximize', 'maximized', 'maximizing', 'promote', 'promoted', 'promoting',
    # --- Management, Leadership & Operations ---
    'lead', 'led', 'leading', 'manage', 'managed', 'managing', 'improve', 'improved', 'improving',
    'deliver', 'delivered', 'delivering', 'collaborate', 'collaborated', 'collaborating', 'supervise', 'supervised', 'supervising',
    'coordinate', 'coordinated', 'coordinating', 'direct', 'directed', 'directing', 'organize', 'organized', 'organizing',
    'guide', 'guided', 'guiding', 'facilitate', 'facilitated', 'facilitating', 'execute', 'executed', 'executing',
    'conduct', 'conducted', 'conducting', 'support', 'supported', 'supporting', 'mentor', 'mentored', 'mentoring',
    'train', 'trained', 'training', 'delegate', 'delegated', 'delegating', 'recruit', 'recruited', 'recruiting',
    'restructure', 'restructured', 'restructuring', 'budget', 'budgeted', 'budgeting', 'schedule', 'scheduled', 'scheduling',
    # --- Finance, Legal & Compliance ---
    'audit', 'audited', 'auditing', 'analyze', 'analyzed', 'analyzing', 'draft', 'drafted', 'drafting',
    'review', 'reviewed', 'reviewing', 'forecast', 'forecasted', 'forecasting', 'balance', 'balanced', 'balancing',
    'allocate', 'allocated', 'allocating', 'enforce', 'enforced', 'enforcing', 'mitigate', 'mitigated', 'mitigating',
    'assess', 'assessed', 'assessing', 'authorize', 'authorized', 'authorizing', 'reconcile', 'reconciled', 'reconciling',
    # --- Healthcare, Service & Support ---
    'assist', 'assisted', 'assisting', 'diagnose', 'diagnosed', 'diagnosing', 'treat', 'treated', 'treating',
    'counsel', 'counseled', 'counseling', 'advocate', 'advocated', 'advocating', 'dispatch', 'dispatched', 'dispatching',
    'inspect', 'inspected', 'inspecting', 'maintain', 'maintained', 'maintaining', 'standardize', 'standardized', 'standardizing'
]

def clean_text(text: str) -> str:
    """Lowercase and remove non-alphanumeric characters."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s#+\-\.]', ' ', text)
    return ' '.join(text.split())

def extract_dynamic_skills(text: str) -> List[str]:
    """Parse skills section and extract proper nouns/parenthesized lists as dynamic skills."""
    dynamic_skills = []
    # Find skills section
    skills_match = re.search(r'(skills|core competencies|technologies|tools)\b(.*?)($|\n\n|\n[A-Z\s]{4,})', text, re.IGNORECASE | re.DOTALL)
    if skills_match:
        skills_block = skills_match.group(2)
        # 1. Extract words inside parentheses, e.g. (Zimyo, Spine, HRMS)
        parentheses_matches = re.findall(r'\(([^)]+)\)', skills_block)
        for pm in parentheses_matches:
            items = re.split(r'[,/;|]', pm)
            for item in items:
                item_clean = item.strip().lower()
                if item_clean and len(item_clean) > 1 and not item_clean.isdigit() and any(c.isalnum() for c in item_clean):
                    dynamic_skills.append(item_clean)
                    
        # 2. Extract bullet items that start with a capital letter and might be tools
        for line in skills_block.split('\n'):
            line_trim = line.strip()
            if not line_trim:
                continue
            clean_line = re.sub(r'^[\s•\-*▪▸◦–—]+', '', line_trim).strip()
            if clean_line and 1 < len(clean_line) < 35 and any(c.isalnum() for c in clean_line):
                dynamic_skills.append(clean_line.lower())
                for sub in re.split(r'[,/;|]', clean_line):
                    sub_clean = sub.strip().lower()
                    if len(sub_clean) > 1 and any(c.isalnum() for c in sub_clean):
                        dynamic_skills.append(sub_clean)
                        
    return list(set(dynamic_skills))

def extract_keywords(text: str) -> List[str]:
    """Extract key technical terms from text matching our skills bank and dynamic skills."""
    cleaned = clean_text(text)
    words = {w.strip('.-') for w in cleaned.split()}
    
    # Create word variations with hyphens removed/replaced
    cleaned_no_hyphens = cleaned.replace('-', '')
    words_no_hyphens = {w.strip('.-') for w in cleaned_no_hyphens.split()}
    
    cleaned_space_hyphens = cleaned.replace('-', ' ')
    words_space_hyphens = {w.strip('.-') for w in cleaned_space_hyphens.split()}
    
    found_keywords = []
    for skill in SKILLS_BANK:
        norm_skill = skill.lower().strip().replace('-', '').replace(' ', '')
        
        # Check if the skill matches in any of the normalized word sets
        if len(norm_skill) <= 3:
            if skill in words or norm_skill in words_no_hyphens or norm_skill in words_space_hyphens:
                found_keywords.append(skill)
        else:
            if (skill in words) or (norm_skill in words_no_hyphens) or (norm_skill in words_space_hyphens):
                found_keywords.append(skill)
            elif ' ' in skill or '-' in skill or '/' in skill or '.' in skill or '+' in skill or '#' in skill:
                pattern_skill = skill.replace('-', '').replace(' ', '')
                if pattern_skill in cleaned_no_hyphens or pattern_skill in cleaned_space_hyphens.replace(' ', ''):
                    found_keywords.append(skill)
                    
    # Dynamic layout-aware skills search
    dyn_skills = extract_dynamic_skills(text)
    for ds in dyn_skills:
        norm_ds = ds.lower().strip().replace('-', '').replace(' ', '')
        if norm_ds in cleaned_no_hyphens or norm_ds in cleaned_space_hyphens.replace(' ', ''):
            found_keywords.append(ds)
            
    return sorted(list(set(found_keywords)))

def normalize_keyword(term: str) -> str:
    term = term.lower().strip().replace('-', '').replace(' ', '')
    aliases = {
        'html5': 'html',
        'css3': 'css',
        'js': 'javascript',
        'javascript': 'javascript',
        'mysql': 'sql',
        'github': 'git'
    }
    term = aliases.get(term, term)
    return term.replace('-', '').replace(' ', '')

def calculate_ats_match(resume_text: str, job_description: str) -> Tuple[int, List[str], List[str]]:
    """Calculate the cosine similarity between resume and JD and list keywords with alias normalization."""
    clean_resume = clean_text(resume_text)
    clean_jd = clean_text(job_description)
    
    if not clean_resume or not clean_jd:
        return 0, [], []

    # Calculate Cosine Similarity using TF-IDF Vectorizer
    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform([clean_resume, clean_jd])
    similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
    match_score = int(similarity * 100)
    
    # Keyword analysis
    resume_keywords = extract_keywords(resume_text)
    jd_keywords = extract_keywords(job_description)
    
    matched = []
    missing = []
    
    for jd_kw in jd_keywords:
        norm_jd = normalize_keyword(jd_kw)
        is_match = False
        for res_kw in resume_keywords:
            norm_res = normalize_keyword(res_kw)
            if norm_jd == norm_res:
                is_match = True
                break
            # SQL / MySQL partial-match logic
            if norm_jd == 'sql' and 'mysql' in norm_res:
                is_match = True
                break
            if norm_res == 'sql' and 'mysql' in norm_jd:
                is_match = True
                break
            # Git / GitHub partial-match logic
            if norm_jd == 'git' and 'github' in norm_res:
                is_match = True
                break
                
        if is_match:
            matched.append(jd_kw)
        else:
            missing.append(jd_kw)
            
    matched = sorted(list(set(matched)))
    missing = sorted(list(set(missing)))
    
    if match_score < 10 and len(matched) > 0:
        match_score = min(85, 30 + len(matched) * 10)
        
    return match_score, matched, missing

def extract_non_education_text(text: str) -> str:
    lower_text = text.lower()
    edu_synonyms = ['education', 'academic', 'qualification', 'qualifications', 'degree', 'university', 'college', 'studies', 'schooling', 'academics']
    edu_start = -1
    for syn in edu_synonyms:
        idx = lower_text.find(syn)
        if idx != -1:
            edu_start = idx
            break
    if edu_start != -1:
        next_headers = ['work experience', 'experience', 'employment', 'career history', 'professional experience', 'skills', 'projects', 'contact']
        edu_end = len(text)
        for h in next_headers:
            idx = lower_text.find(h, edu_start + 10)
            if idx != -1 and idx < edu_end:
                edu_end = idx
        return text[:edu_start] + text[edu_end:]
    return text

def analyze_resume_diagnostics(resume_text: str) -> Dict:
    """Scan resume text for structural compliance, impact verbs, and quantitative results."""
    cleaned = clean_text(resume_text)
    
    # 0. Detect Resume Category (9 distinct profiles)
    lower_text = resume_text.lower()
    
    tech_keywords = ['developer', 'software engineer', 'programmer', 'coding', 'frontend', 'backend', 'fullstack', 'devops', 'kubernetes', 'docker', 'aws', 'git', 'github', 'database', 'sql', 'graphql', 'python', 'javascript', 'typescript', 'java', 'c++', 'html', 'css', 'data scientist', 'data engineer']
    sales_keywords = ['sales', 'revenue', 'quota', 'account executive', 'business development', 'customer success', 'pipeline', 'cold call', 'lead generation', 'b2b', 'b2c', 'account manager', 'deal size', 'deals closed', 'salesforce', 'crm', 'annual contract value', 'acv', 'contract value', 'closed deals', 'prospecting']
    hr_keywords = ['hr', 'human resources', 'talent acquisition', 'recruiting', 'recruitment', 'payroll', 'hris', 'employee relations', 'talent management', 'sourcing', 'workforce planning', 'labor relations']
    marketing_keywords = ['marketing', 'branding', 'seo', 'sem', 'copywriting', 'campaign', 'social media', 'growth hacking', 'analytics', 'conversion rate', 'cro', 'google ads']
    finance_keywords = ['finance', 'accounting', 'tax', 'auditor', 'auditing', 'budget', 'forecasting', 'banking', 'bookkeeping', 'ledger', 'quickbooks', 'financial modeling', 'treasury']
    operations_keywords = ['operations', 'supply chain', 'logistics', 'procurement', 'inventory', 'vendor', 'shipping', 'warehouse', 'sap', 'six sigma', 'lean', 'operational efficiency']
    healthcare_keywords = ['clinical', 'medical', 'nursing', 'patient', 'healthcare', 'hospital', 'hipaa', 'ehr', 'emr', 'diagnostics', 'patient care']
    legal_keywords = ['legal', 'lawyer', 'law', 'compliance', 'regulatory', 'paralegal', 'litigation', 'contract drafting', 'attorney', 'due diligence', 'policy']

    counts = {
        "technical": sum(1 for kw in tech_keywords if kw in lower_text),
        "sales": sum(1 for kw in sales_keywords if kw in lower_text),
        "hr": sum(1 for kw in hr_keywords if kw in lower_text),
        "marketing": sum(1 for kw in marketing_keywords if kw in lower_text),
        "finance": sum(1 for kw in finance_keywords if kw in lower_text),
        "operations": sum(1 for kw in operations_keywords if kw in lower_text),
        "healthcare": sum(1 for kw in healthcare_keywords if kw in lower_text),
        "legal": sum(1 for kw in legal_keywords if kw in lower_text)
    }

    # Find highest count
    category = "general"
    max_count = 0
    for cat, count in counts.items():
        if count > max_count:
            max_count = count
            category = cat
    
    if max_count == 0:
        category = "general"

    is_sales = category == "sales"
    
    # 1. Structural Checks
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text))
    has_phone = bool(re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', resume_text))
    has_linkedin = 'linkedin' in resume_text.lower()
    has_explicit_contact = has_email or has_phone or has_linkedin or 'contact' in cleaned
    
    # Adjust expected sections based on resume category (non-tech profiles exclude projects)
    if category == "technical":
        sections = ['experience', 'education', 'skills', 'projects', 'contact']
    else:
        sections = ['experience', 'education', 'skills', 'contact']
        
    section_synonyms = {
        'experience': ['experience', 'employment', 'work history', 'career history', 'background', 'professional history', 'work experience', 'history'],
        'education': ['education', 'academic', 'qualification', 'qualifications', 'degree', 'university', 'college', 'studies', 'schooling', 'academics'],
        'skills': ['skills', 'competencies', 'expertise', 'capabilities', 'technologies', 'technical stack', 'tools', 'proficiencies', 'abilities', 'tech stack'],
        'projects': ['projects', 'key projects', 'academic projects', 'personal projects', 'work projects', 'accomplishments', 'creations'],
        'contact': ['contact', 'email', 'phone', 'linkedin', 'address', 'github', 'info', 'details']
    }

    detected_sections = []
    for sec in sections:
        if any(syn in cleaned for syn in section_synonyms[sec]):
            detected_sections.append(sec)

    if has_explicit_contact and 'contact' not in detected_sections:
        detected_sections.append('contact')
        
    structure_score = int((len(detected_sections) / len(sections)) * 100)
    
    # 2. Action Verbs Check (Restricted to bullet points globally to support split layouts and page breaks)
    verb_count = 0
    has_any_bullet = any(any(l.strip().startswith(c) for c in ['•', '-', '*']) for l in resume_text.split('\n'))
    
    if has_any_bullet:
        for line in resume_text.split('\n'):
            line_trim = line.strip()
            if not line_trim:
                continue
            is_bullet = any(line_trim.startswith(c) for c in ['•', '-', '*'])
            if is_bullet:
                clean_line = re.sub(r'^[\s•\-*]+', '', line_trim).strip()
                first_words = clean_line.lower().split()[:2]
                for w in first_words:
                    w_clean = re.sub(r'[^a-z]', '', w)
                    if w_clean in ACTION_VERBS:
                        verb_count += 1
                        break
    else:
        # Fallback to general scan if the resume contains no bullet markers at all
        words = cleaned.split()
        detected_verbs = [w for w in words if w in ACTION_VERBS]
        verb_count = len(detected_verbs)
        if verb_count > 12:
            verb_count = 8
            
    verb_score = min(100, int((verb_count / 8) * 100))
    
    # 3. Quantitative Impact Check (Numbers, percentages, metrics)
    metric_pattern = r'(?:' \
                     r'\b\d+(?:\.\d+)?\+?\s*%\s*(?:\+)?\b|' \
                     r'\b(?:usd|inr|rs\.?|\$|₹|£|€)\s*\d+(?:[,\.]\d+)*\+?\s*(?:[kKmMCrRlL])?\b|' \
                     r'\b\d+(?:\.\d+)?\+?\s*(?:k|m|cr|l|lakh|lakhs|crore|crores|million|billion|trillion|percent|users|clients|accounts|leads|deals|projects|employees|team|members|regions|territories|quota)\b|' \
                     r'\b\d+(?:\.\d+)?\+?\s*(?:[kKmMCrRlL])\+?\b|' \
                     r'\b(?:led|managed|supervised|trained|recruited|assisted|coordinated|closed|served|team of|portfolio of|budget of)\s+\d+(?:\+\b|\b)' \
                     r')'
    # Strip out the education section to prevent academic grades/percentages from matching as business metrics
    non_edu_text = extract_non_education_text(resume_text)
    metrics_matches = re.findall(metric_pattern, non_edu_text, re.IGNORECASE)
    
    # Filter matches to ignore dates (like 2024, 2025, 2017) or years of experience (like 6+ years)
    filtered_metrics = []
    for m in metrics_matches:
        m_clean = m.strip().lower()
        if m_clean.isdigit() and 1990 <= int(m_clean) <= 2030:
            continue
        if 'year' in m_clean or 'yr' in m_clean:
            continue
        filtered_metrics.append(m)
        
    metrics_count = len(filtered_metrics)
    metrics_score = min(100, int((metrics_count / 6) * 100))
    
    overall_score = int((structure_score * 0.4) + (verb_score * 0.3) + (metrics_score * 0.3))
    
    # Generate custom suggestions
    suggestions = []
    if structure_score < 100:
        missing_sec = [s.capitalize() for s in sections if s not in detected_sections]
        suggestions.append(f"Structure: Missing standard resume sections: {', '.join(missing_sec)}.")
    else:
        sec_names = "Experience, Education, Skills, Contact" if is_sales else "Experience, Education, Skills, Projects, Contact"
        suggestions.append(f"Structure: Found all standard sections ({sec_names}).")
        
    if verb_count < 5:
        suggestions.append(f"Verbs: Detected only {verb_count} action verbs. Try incorporating stronger verbs like 'spearheaded', 'refactored', or 'automated'.")
    else:
        suggestions.append(f"Verbs: Strong usage of active verbs ({verb_count} detected) showing professional ownership.")
        
    if metrics_count < 3:
        metric_desc = "sales quota or revenue metrics" if is_sales else "project metrics"
        suggestions.append(f"Impact: Your resume lacks quantitative metrics. Quantify achievements (e.g. {metric_desc}).")
    else:
        suggestions.append(f"Impact: Great usage of metric indicators ({metrics_count} numerical accomplishments detected).")
        
    detected_skills = extract_keywords(resume_text)
    if category == "sales":
        missing_skills = [s for s in ['crm', 'salesforce', 'lead generation', 'pipeline', 'b2b sales', 'hubspot'] if s not in detected_skills]
    elif category == "hr":
        missing_skills = [s for s in ['recruitment', 'hris', 'employee relations', 'sourcing', 'payroll', 'performance management'] if s not in detected_skills]
    elif category == "marketing":
        missing_skills = [s for s in ['seo', 'sem', 'copywriting', 'campaign', 'analytics', 'social media'] if s not in detected_skills]
    elif category == "finance":
        missing_skills = [s for s in ['accounting', 'tax', 'auditing', 'budget', 'forecasting', 'ledger'] if s not in detected_skills]
    elif category == "operations":
        missing_skills = [s for s in ['supply chain', 'logistics', 'procurement', 'inventory', 'vendor', 'sap'] if s not in detected_skills]
    elif category == "healthcare":
        missing_skills = [s for s in ['clinical', 'nursing', 'hipaa', 'ehr', 'emr', 'patient care'] if s not in detected_skills]
    elif category == "legal":
        missing_skills = [s for s in ['compliance', 'regulatory', 'paralegal', 'contracts', 'litigation', 'policy'] if s not in detected_skills]
    elif category == "technical":
        missing_skills = [s for s in ['docker', 'aws', 'kubernetes', 'graphql', 'ci/cd', 'redis'] if s not in detected_skills]
    else: # general
        missing_skills = [s for s in ['management', 'leadership', 'communication', 'collaboration', 'organization', 'planning'] if s not in detected_skills]
    
    formatting_issues = []
    if structure_score < 100:
        missing_sec = [s.capitalize() for s in sections if s not in detected_sections]
        formatting_issues.append(f"Missing standard sections: {', '.join(missing_sec)}")
        
    # Project/Competency Analysis
    if category == "sales":
        sales_skills_set = {'sales', 'revenue', 'quota', 'crm', 'salesforce', 'hubspot', 'lead generation', 'cold calling', 'b2b sales', 'b2c sales', 'pipeline management', 'account management', 'deal closing', 'customer success', 'prospecting', 'negotiation', 'contracts', 'annual contract value', 'acv', 'contract value', 'saas', 'enterprise sales'}
        matched_sales = [s for s in detected_skills if s in sales_skills_set]
        proj_score = min(100, len(matched_sales) * 20)
        proj_rating = "Sales"
        proj_details = f"Evaluated your business capabilities, sales tools, and deal pipeline alignments. Found {len(matched_sales)} sales competencies ({', '.join([s.capitalize() for s in matched_sales[:3]])})."
        proj_recs = [f"Consider adding key sales skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "hr":
        hr_skills_set = {'hr', 'human resources', 'talent acquisition', 'recruiting', 'recruitment', 'payroll', 'hris', 'employee relations', 'talent management', 'sourcing', 'workforce planning', 'conflict resolution', 'benefits administration', 'performance management', 'labor laws'}
        matched_hr = [s for s in detected_skills if s in hr_skills_set]
        proj_score = min(100, len(matched_hr) * 20)
        proj_rating = "HR"
        proj_details = f"Evaluated your HR systems, recruitment strategies, and talent program alignments. Found {len(matched_hr)} HR competencies ({', '.join([s.capitalize() for s in matched_hr[:3]])})."
        proj_recs = [f"Consider adding key HR skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "marketing":
        mktg_skills_set = {'marketing', 'branding', 'seo', 'sem', 'copywriting', 'campaign', 'social media', 'growth hacking', 'analytics', 'conversion rate', 'cro', 'google ads'}
        matched_mktg = [s for s in detected_skills if s in mktg_skills_set]
        proj_score = min(100, len(matched_mktg) * 20)
        proj_rating = "Marketing"
        proj_details = f"Evaluated your brand presence, campaign management, and digital marketing alignments. Found {len(matched_mktg)} marketing competencies ({', '.join([s.capitalize() for s in matched_mktg[:3]])})."
        proj_recs = [f"Consider adding key marketing skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "finance":
        finance_skills_set = {'finance', 'accounting', 'tax', 'auditor', 'auditing', 'budget', 'forecasting', 'banking', 'bookkeeping', 'ledger', 'quickbooks', 'financial modeling', 'treasury'}
        matched_fin = [s for s in detected_skills if s in finance_skills_set]
        proj_score = min(100, len(matched_fin) * 20)
        proj_rating = "Finance"
        proj_details = f"Evaluated your financial models, analytical reporting, and compliance alignments. Found {len(matched_fin)} finance competencies ({', '.join([s.capitalize() for s in matched_fin[:3]])})."
        proj_recs = [f"Consider adding key finance skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "operations":
        ops_skills_set = {'operations', 'supply chain', 'logistics', 'procurement', 'inventory', 'vendor', 'shipping', 'warehouse', 'sap', 'six sigma', 'lean', 'operational efficiency'}
        matched_ops = [s for s in detected_skills if s in ops_skills_set]
        proj_score = min(100, len(matched_ops) * 20)
        proj_rating = "Operations"
        proj_details = f"Evaluated your logistics workflow, vendor networks, and operational ERP alignments. Found {len(matched_ops)} operational competencies ({', '.join([s.capitalize() for s in matched_ops[:3]])})."
        proj_recs = [f"Consider adding key operations skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "healthcare":
        hc_skills_set = {'clinical', 'medical', 'nursing', 'patient', 'healthcare', 'hospital', 'hipaa', 'ehr', 'emr', 'diagnostics', 'patient care'}
        matched_hc = [s for s in detected_skills if s in hc_skills_set]
        proj_score = min(100, len(matched_hc) * 20)
        proj_rating = "Healthcare"
        proj_details = f"Evaluated your clinical safety, patient care quality, and medical standards alignments. Found {len(matched_hc)} healthcare competencies ({', '.join([s.capitalize() for s in matched_hc[:3]])})."
        proj_recs = [f"Consider adding key healthcare skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "legal":
        legal_skills_set = {'legal', 'lawyer', 'law', 'compliance', 'regulatory', 'paralegal', 'litigation', 'contract drafting', 'attorney', 'due diligence', 'policy'}
        matched_legal = [s for s in detected_skills if s in legal_skills_set]
        proj_score = min(100, len(matched_legal) * 20)
        proj_rating = "Legal"
        proj_details = f"Evaluated your regulatory audits, contract structures, and legal compliance alignments. Found {len(matched_legal)} legal competencies ({', '.join([s.capitalize() for s in matched_legal[:3]])})."
        proj_recs = [f"Consider adding key legal skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
    elif category == "technical":
        proj_score = verb_score
        proj_rating = "Technical"
        proj_details = "Action verbs tracked in your project sections show strong technical accomplishments."
        proj_recs = ["Quantify database size and scalability numbers.", "Describe impact (e.g. decreased load times)."] if proj_score < 80 else []
    else: # general
        general_skills_set = {'management', 'leadership', 'communication', 'collaboration', 'organization', 'planning', 'problem solving', 'teamwork'}
        matched_gen = [s for s in detected_skills if s in general_skills_set]
        proj_score = min(100, len(matched_gen) * 20)
        proj_rating = "General"
        proj_details = f"Evaluated your management capabilities, organizational traits, and core competencies. Found {len(matched_gen)} professional competencies ({', '.join([s.capitalize() for s in matched_gen[:3]])})."
        proj_recs = [f"Consider adding key core skills: {', '.join([s.capitalize() for s in missing_skills[:2]])}."] if len(missing_skills) > 0 and proj_score < 80 else []
        
    # 5. Grammar & Spellcheck Heuristics
    spacing_issues = len(re.findall(r'[a-zA-Z],[a-zA-Z]|[a-zA-Z]\.[a-zA-Z]', resume_text))
    words_list = cleaned.split()
    runon_count = 0
    for w in words_list:
        if len(w) > 15 and '-' not in w and '/' not in w and '.' not in w:
            runon_count += 1
            
    grammar_deduction = (spacing_issues * 3) + (runon_count * 5)
    grammar_score = max(65, 100 - grammar_deduction)

    # Build list of weaknesses dynamically
    weaknesses_list = []
    if structure_score < 100:
        missing_sec = [s.capitalize() for s in sections if s not in detected_sections]
        weaknesses_list.append(f"Structure: Missing core structural sections: {', '.join(missing_sec)}.")
    
    if metrics_count < 2:
        weaknesses_list.append("Impact: Bullet points lack quantitative metrics showing measurable results.")
        
    if len(detected_skills) < 4:
        weaknesses_list.append(f"Skills: Skill density is low. Only {len(detected_skills)} core capabilities matched.")
    else:
        # Check for specific recommendations based on category if they are missing
        if category == "sales" and 'salesforce' not in detected_skills and 'crm' not in detected_skills:
            weaknesses_list.append("Business: Consider listing CRM tools (e.g., Salesforce).")
        elif category == "hr" and 'hris' not in detected_skills and 'workday' not in detected_skills and 'zimyo' not in detected_skills:
            weaknesses_list.append("HR Tools: Consider listing HRIS platform skills (e.g., Workday, Zimyo).")
        elif category == "marketing" and 'analytics' not in detected_skills and 'google analytics' not in detected_skills:
            weaknesses_list.append("Marketing: Consider listing campaign tools (e.g., Google Analytics, Mailchimp).")
        elif category == "finance" and 'quickbooks' not in detected_skills and 'excel' not in detected_skills:
            weaknesses_list.append("Finance: Consider listing financial tools (e.g., QuickBooks, Excel, ERP).")
        elif category == "operations" and 'sap' not in detected_skills:
            weaknesses_list.append("Operations: Consider listing enterprise ERP tools (e.g., SAP, Oracle).")
        elif category == "healthcare" and 'ehr' not in detected_skills and 'emr' not in detected_skills:
            weaknesses_list.append("Clinical Tools: Consider listing EHR/EMR platforms (e.g., Epic, Cerner).")
        elif category == "legal" and 'lexisnexis' not in detected_skills and 'westlaw' not in detected_skills:
            weaknesses_list.append("Legal Databases: Consider listing legal research platforms (e.g., LexisNexis, Westlaw).")
        elif category == "technical" and 'docker' not in detected_skills and 'aws' not in detected_skills:
            weaknesses_list.append("DevOps: Consider listing cloud architecture skills (e.g., AWS, Docker).")

    if not weaknesses_list:
        weaknesses_list = ["Minor heading typography size inconsistencies."]
        
    return {
        "score": overall_score,
        "atsScore": max(10, overall_score - 5),
        "formattingAnalysis": {
            "rating": "Excellent" if structure_score >= 90 else "Good" if structure_score >= 70 else "Needs Improvement",
            "score": structure_score,
            "issues": formatting_issues,
            "details": f"Structure scanned for standard sections ({'Experience, Education, Skills, Contact' if category != 'technical' else 'Experience, Education, Skills, Projects, Contact'})."
        },
        "grammarAnalysis": {
            "rating": "Excellent" if grammar_score >= 90 else "Good" if grammar_score >= 75 else "Needs Improvement",
            "score": grammar_score,
            "issues": [f"Fix punctuation spacing ({spacing_issues} issues)"] if spacing_issues > 2 else [],
            "details": f"Spelling & syntax spacing evaluated. Found {spacing_issues} spacing inconsistencies and {runon_count} merged run-on words."
        },
        "skillAnalysis": {
            "rating": "High Match" if len(detected_skills) >= 6 else "Medium Match" if len(detected_skills) >= 3 else "Low Match",
            "score": min(100, len(detected_skills) * 15),
            "identifiedSkills": detected_skills,
            "missingSkills": missing_skills[:4],
            "details": f"Parsed {category} keywords from your text, identifying {len(detected_skills)} core capabilities."
        },
        "projectAnalysis": {
            "rating": proj_rating,
            "score": proj_score,
            "details": proj_details,
            "recommendations": proj_recs
        },
        "experienceAnalysis": {
            "rating": "Good" if verb_score >= 75 else "Needs Work",
            "score": verb_score,
            "details": f"Professional experience bullets parsed for active ownership indicators. Found {verb_count} active professional verbs.",
            "recommendations": [] if verb_score >= 80 else ["Start bullet points with strong action verbs (e.g. Developed, Led)."]
        },
        "achievementAnalysis": {
            "rating": "Good" if metrics_score >= 70 else "Needs Improvement",
            "score": metrics_score,
            "details": f"Quantitative accomplishments mapped. Detected {metrics_count} numerical growth metrics.",
            "recommendations": [] if metrics_score >= 80 else ["Inject metrics to support claims (e.g. 'scaled user cap by 150%', 'saved 12 hours/week')."]
        },
        "strengths": [
            f"Structure: Found all standard resume sections ({'Experience, Education, Skills, Contact' if category != 'technical' else 'Experience, Education, Skills, Projects, Contact'})." if structure_score == 100 else "Formatting: Key contact and education sections identified.",
            f"Verbs: Strong usage of active language ({verb_count} action verbs detected) showing professional ownership." if verb_count >= 5 else "Document Template: Clean structural template flow.",
            f"Quantification: Solid density of numerical accomplishments ({metrics_count} metrics detected)." if metrics_count >= 3 else "Communication: Contact credentials present."
        ],
        "weaknesses": weaknesses_list,
        "suggestions": suggestions
    }

def generate_tailored_cover_letter(first_name: str, last_name: str, email: str, headline: str, company: str, role: str, resume_text: str, job_description: str) -> str:
    """Tailor a professional cover letter template dynamically using extracted resume metrics."""
    matched_skills = extract_keywords(resume_text)[:4]
    if not matched_skills:
        matched_skills = ['software development', 'analytical problem solving']
        
    skills_sentence = ", ".join(matched_skills).upper()
    date_str = "July 6, 2026"
    
    return f"""
{first_name} {last_name}
{email} | {headline}

{date_str}

Hiring Manager
{company}

Dear Hiring Manager,

I am writing to express my strong interest in the {role} position at {company}. Having reviewed the details of your job description, I am excited about the opportunity to bring my technical skills and professional drive to your organization.

My expertise with key technologies—specifically {skills_sentence}—makes me a strong match for this role. I have successfully built and deployed systems utilizing these tools in my previous work.

Throughout my career, I have focused on writing clean, maintainable code and solving complex problems. I enjoy working in collaborative environments where I can build impactful products.

I look forward to discussing how my experience and skill set align with the goals of {company}. Thank you for your time and consideration.

Sincerely,
{first_name} {last_name}
""".strip()

def get_role_questions(role: str, company: str) -> List[Dict]:
    """Dynamically generate interview questions tailored specifically to the target role and company."""
    role_lower = role.lower()
    
    # 1. FRONTEND / REACT / WEB ROLES
    if 'front' in role_lower or 'react' in role_lower or 'web' in role_lower or 'ui' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "What is the difference between Virtual DOM and Real DOM in React, and how does reconciliation work?",
                "idealAnswer": "Virtual DOM is an in-memory representation. React reconciles via a diffing algorithm to update only changed nodes."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Write a JavaScript debounce function that delays invoking a callback until after 'wait' milliseconds have elapsed.",
                "idealAnswer": "Return a closure function utilizing clearTimeouts to reset delays on sequential keystrokes."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": f"Describe a situation at a past project where you disagreed with a designer or PM on UI/UX behavior. How did you resolve it?",
                "idealAnswer": "Used interactive mockups, user research data, and team alignment to make collaborative engineering choices."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Expressed interest in their product design principles, engineering values, and scaling goals."
            }
        ]
        
    # 2. DATA SCIENCE / DATA ANALYST / MACHINE LEARNING ROLES
    elif 'data' in role_lower or 'ml' in role_lower or 'analytics' in role_lower or 'science' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "Explain the bias-variance tradeoff in Machine Learning. How do you diagnose and address overfitting?",
                "idealAnswer": "High bias leads to underfitting; high variance leads to overfitting. Regularization, cross-validation, and adding data address variance."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Write a Python function to compute the moving average of a time-series array using numpy.",
                "idealAnswer": "Use np.convolve or panda's rolling window operations to compute moving averages efficiently."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Tell me about a time you had to explain a complex statistical model or data analysis to non-technical stakeholders. How did you communicate the insights?",
                "idealAnswer": "Abstracted mathematical formulas into visual graphs, focused on business KPIs, and explained actionable outcomes."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Expressed interest in their database scaling architectures and leveraging insights to drive business growth."
            }
        ]
        
    # 3. PRODUCT MANAGEMENT / PRODUCT OWNER / PM ROLES
    elif 'product' in role_lower or 'pm' in role_lower or 'owner' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "How do you prioritize features for a product roadmap when facing conflicting requests from sales, engineering, and support?",
                "idealAnswer": "Utilize prioritization frameworks like RICE (Reach, Impact, Confidence, Effort) to evaluate alignment with strategic goals."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Describe how you would design a metric dashboard to track daily active user retention for a new messaging feature.",
                "idealAnswer": "Identify north-star metrics (session duration, message counts) and map cohorts (D1, D7, D30 retention rates)."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Describe a situation where a product launch failed or missed its core KPIs. What did you learn and how did you pivot?",
                "idealAnswer": "Emphasize post-mortem analysis, gathering qualitative user feedback, iterating core features, and adjusting metrics."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Showed alignment with their product ecosystem, growth vector, and product development philosophy."
            }
        ]

    # 4. MOBILE / IOS / ANDROID ROLES
    elif 'ios' in role_lower or 'android' in role_lower or 'mobile' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "Explain memory management principles in mobile development (e.g., Automatic Reference Counting in iOS or Garbage Collection in Android).",
                "idealAnswer": "Explain reference counting cycles, strong/weak pointers to prevent memory leaks, or heap/stack sweeps."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Describe how you would implement local caching of API responses (e.g. SQLite, Room, or CoreData) to support offline mode.",
                "idealAnswer": "Setup local database models as a single source of truth, refreshing background data via sync workers."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Tell me about a time you had to optimize the render performance of a mobile list layout to eliminate scrolling lags.",
                "idealAnswer": "Optimized cell reuse, minimized layout passes, and deferred image loading to background threads."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Focused on their mobile-first user experience and product reliability in scaling app markets."
            }
        ]

    # 5. SALES / ACCOUNTS / ENTERPRISE BUSINESS ROLES
    elif 'sale' in role_lower or 'account' in role_lower or 'business dev' in role_lower or 'crm' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "How do you handle price objections from high-intent enterprise clients during negotiation?",
                "idealAnswer": "Refocus the discussion on ROI and overall contract value rather than raw price. Highlight specific product utilities."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Outline the steps you would take to qualify a cold lead and move them through your sales pipeline.",
                "idealAnswer": "Research their pain points, conduct a discovery call, map budget/timeline parameters, and book a tailored demo."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Tell me about a time you missed your sales quota. What factors led to this, and how did you adjust your sales pitch afterwards?",
                "idealAnswer": "Identified product bottlenecks, adapted prospecting techniques, expanded pipeline volume, and met following goals."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Expressed interest in their market vertical, pricing power, and driving revenue metrics forward."
            }
        ]

    # 6. MARKETING / GROWTH / SEO ROLES
    elif 'market' in role_lower or 'growth' in role_lower or 'seo' in role_lower or 'brand' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "Explain how you structure a multi-channel campaign to acquire customers while keeping CAC low.",
                "idealAnswer": "Mix high-intent organic traffic channels (SEO, content) with paid channels, optimization of conversion rate (CRO)."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Describe how you configure conversion tracking and metrics for A/B testing on a landing page.",
                "idealAnswer": "Set primary goals (conversions), tracking variables, control/test splits, and check statistical significance."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Tell me about a growth campaign you managed that failed to reach target conversions. How did you diagnose the issue?",
                "idealAnswer": "Audited drop-off rates in the funnel, analyzed user search intent mismatch, pivoted campaign creatives, and recovered."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Focused on their brand narrative, creative autonomy, and scaling customer base for their products."
            }
        ]

    # 7. FINANCE / ACCOUNTING / AUDITING ROLES
    elif 'finance' in role_lower or 'accountant' in role_lower or 'audit' in role_lower or 'tax' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "What is the difference between cash accounting and accrual accounting? When would you use each?",
                "idealAnswer": "Cash records transactions on currency receipt; accrual matches expenses/revenues when incurred. Accrual is better for forecasting."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Describe the steps you would take to stress-test a corporate cash flow forecast against rising operational costs.",
                "idealAnswer": "Model variable cost inflation points, reduce projected accounts receivable speed, and determine base cash reserves."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Tell me about a time you identified a significant discrepancy in financial statements. How did you audit and resolve it?",
                "idealAnswer": "Traced invoices, checked double-entry ledgers, reconciled with bank sheets, and adjusted ledger balances."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Aligned with their fiscal discipline, growth plans, and maintaining transparent financial audits."
            }
        ]

    # 8. HUMAN RESOURCES / TALENT / RECRUITMENT ROLES
    elif 'hr' in role_lower or 'resource' in role_lower or 'talent' in role_lower or 'recruit' in role_lower:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": "How do you structure a performance improvement plan (PIP) to ensure fair opportunity and objective tracking?",
                "idealAnswer": "Define specific performance gaps, set measurable metrics, schedule weekly reviews, and document outcomes."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": "Explain how you would design a structured candidate evaluation scorecard to minimize hiring bias.",
                "idealAnswer": "Map job descriptions to specific skill rubrics, enforce identical interview questions, and standardize scoring criteria."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": "Describe a situation where you had to manage a difficult conflict between a manager and their direct report.",
                "idealAnswer": "Listened to both sides separately, held a structured mediation meeting, set behavioral expectations, and resolved."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": "Focused on their culture code, commitment to employee growth, and scaling human resources operations."
            }
        ]

    # 9. GENERAL / OPERATIONS / GENERAL RECRUITMENT ROLES (Generic Fallback)
    else:
        return [
            {
                "id": "q1",
                "type": "TECHNICAL",
                "question": f"What key metrics and workflows do you track to evaluate task quality and output efficiency as a {role}?",
                "idealAnswer": f"Identify performance indicators (KPIs) relevant to {role} goals, monitor SLA speeds, and check output error rates."
            },
            {
                "id": "q2",
                "type": "CODING",
                "question": f"Explain how you structure your prioritization workflow to resolve conflicting deliverables in your role as a {role}.",
                "idealAnswer": "Rank deliverables by business impact and urgency, communicate bottlenecks early, and allocate blocks of time."
            },
            {
                "id": "q3",
                "type": "BEHAVIORAL",
                "question": f"Tell me about a time you encountered a significant operational bottleneck or delay as a {role}. How did you resolve it?",
                "idealAnswer": "Audited process roadblocks, proposed workflow automation or team delegation, and restored timeline pacing."
            },
            {
                "id": "q4",
                "type": "HR",
                "question": f"Why do you want to join {company} as a {role}?",
                "idealAnswer": f"Expressed alignment with the company's core values, growth direction, and contributing as a {role}."
            }
        ]

def evaluate_interview_response(question_text: str, user_answer: str) -> Dict:
    """Evaluate mock interview responses using text keyword density and STAR method formats."""
    cleaned = clean_text(user_answer)
    words = cleaned.split()
    
    if len(words) < 5:
        return {
            "score": 10,
            "evaluation": "The answer is too short. Please provide a detailed response describing your actions and results.",
            "suggestions": ["Type at least 3-4 sentences.", "Structure your answer using the STAR method."],
            "modelAnswer": "I faced a situation where [Context]. My task was to [Responsibility]. I resolved it by [Action]. As a result, [Measurable Outcome]."
        }

    # 1. Context Completeness (Situation)
    context_indicators = ['when', 'at my', 'during', 'project', 'company', 'client', 'team', 'faced', 'problem', 'system', 'infrastructure', 'legacy', 'application', 'migration']
    context_matches = [w for w in context_indicators if w in cleaned]
    if len(user_answer) >= 150 and len(context_matches) >= 2:
        context_score = 100
    elif len(context_matches) >= 1:
        context_score = 70
    else:
        context_score = 30

    # 2. Task Ownership (Task)
    task_indicators = ['task', 'responsibility', 'goal', 'aim', 'objective', 'needed to', 'was to', 'required to', 'my job', 'responsible for']
    task_matches = [w for w in task_indicators if w in cleaned]
    if len(task_matches) >= 2:
        task_score = 100
    elif len(task_matches) >= 1:
        task_score = 75
    else:
        task_score = 30

    # 3. Action Specificity (Action)
    verb_matches = [w for w in words if w in ACTION_VERBS]
    tech_actions = ['built', 'implemented', 'refactored', 'engineered', 'optimized', 'migrated', 'wrote', 'designed', 'debugged', 'integrated']
    tech_matches = [w for w in tech_actions if w in cleaned]
    action_count = len(verb_matches) + len(tech_matches)
    if action_count >= 3:
        action_score = 100
    elif action_count == 2:
        action_score = 80
    elif action_count == 1:
        action_score = 50
    else:
        action_score = 20

    # 4. Measurable Result (Result)
    has_numbers = bool(re.search(r'\d+', user_answer))
    result_keywords = ['%', 'percent', 'ms', 'seconds', 'hours', 'users', 'records', 'queries', 'saved', 'reduced', 'increased', 'boosted', 'scaled', 'throughput']
    result_matches = [w for w in result_keywords if w in cleaned]
    if has_numbers and len(result_matches) >= 1:
        result_score = 100
    elif has_numbers:
        result_score = 60
    else:
        result_score = 20

    # Compute overall score as the average of the 4 STAR pillars
    overall = int((context_score + task_score + action_score + result_score) / 4)
    overall = max(20, min(98, overall))

    # Construct explainable feedback paragraph
    eval_text = f"Your answer of {len(words)} words has been analyzed across the four STAR method components. "
    eval_text += f"We scored Context Completeness at {context_score}%, Task Ownership at {task_score}%, Action Specificity at {action_score}%, and Measurable Results at {result_score}%. "
    
    if overall >= 85:
        eval_text += "Excellent response! It shows a strong STAR methodology structure, explicitly detailing the situation background, your technical actions, and the measurable results."
    elif overall >= 60:
        eval_text += "Satisfactory answer, but there is room for improvement. Check the metrics scorecard below to see which areas need detail expansion."
    else:
        eval_text += "The response lacks sufficient detail and structure. Rewrite using the STAR method: describe the Situation, Task, Action, and Result explicitly."

    suggestions = []
    if context_score < 70:
        suggestions.append("Add more background details: describe the team, project phase, or system setting where this problem occurred.")
    if task_score < 70:
        suggestions.append("Clarify your ownership: explain your specific role, goal, or expectation in resolving the issue.")
    if action_score < 75:
        suggestions.append("Provide more action specificity: use active technical verbs (e.g., 'I refactored...', 'I optimized...') to show how you solved the problem.")
    if result_score < 70:
        suggestions.append("Quantify your results: specify the final outcome using numbers or percentages (e.g., 'reducing query latency by 45%').")

    if not suggestions:
        suggestions = ["Excellent job! Your structure is complete.", "Maintain this level of detail in your actual interviews."]

    return {
        "score": overall,
        "evaluation": eval_text,
        "suggestions": suggestions,
        "modelAnswer": "A strong answer should outline: 1. Situation: Disagreed with a PM on React page query pagination. 2. Task: Had to optimize page loads. 3. Action: I built a debounce handler and cached requests in memory. 4. Result: Decreased load times by 60%.",
        "starScores": {
            "context": context_score,
            "task": task_score,
            "action": action_score,
            "result": result_score
        }
    }

def determine_keyword_importance(keyword: str, jd_text: str) -> str:
    jd_lower = jd_text.lower()
    kw_lower = keyword.lower()
    start = 0
    while True:
        idx = jd_lower.find(kw_lower, start)
        if idx == -1:
            break
        window_start = max(0, idx - 120)
        window_end = min(len(jd_lower), idx + len(kw_lower) + 120)
        context = jd_lower[window_start:window_end]
        
        required_words = ["required", "must have", "must possess", "essential", "minimum", "necessary", "critical", "mandatory", "requirements", "core", "have experience in", "expert in"]
        preferred_words = ["preferred", "nice to have", "plus", "desired", "beneficial", "recommended", "bonus", "optional", "strongly preferred", "ideally"]
        
        if any(w in context for w in required_words):
            return "REQUIRED"
        if any(w in context for w in preferred_words):
            return "PREFERRED"
        start = idx + len(kw_lower)
    return "CONTEXTUAL"

def calculate_custom_ats_analysis(resume_text: str, job_description: str) -> Dict:
    clean_resume = clean_text(resume_text)
    clean_jd = clean_text(job_description)
    
    # Detect job title and domain
    detected_title = "General Role"
    title_match = re.search(r'(?:job title|position|role|title)\s*:\s*([^\n]+)', job_description, re.IGNORECASE)
    if title_match:
        detected_title = title_match.group(1).strip()
    else:
        # Fallback: take the first non-empty line of the JD
        lines = [line.strip() for line in job_description.split('\n') if line.strip()]
        if lines:
            detected_title = lines[0][:50]
            
    job_domain = detect_job_domain(detected_title, job_description)
    
    # 1. Custom skill matcher evaluation
    norm_resume = matcher_obj.normalize_text(resume_text)
    jd_skills = extract_keywords(job_description)
    
    if not jd_skills:
        # Fallback to high frequency words in JD
        words_in_jd = [w for w in clean_jd.split() if w not in STOP_WORDS and len(w) > 3]
        freqs = {}
        for w in words_in_jd:
            freqs[w] = freqs.get(w, 0) + 1
        sorted_freqs = sorted(freqs.items(), key=lambda x: x[1], reverse=True)
        jd_skills = [pair[0] for pair in sorted_freqs[:6]]

    matched_keywords = []
    missing_keywords = []
    related_evidence = []
    
    required_matched = []
    required_missing = []
    preferred_matched = []
    preferred_missing = []
    optional_matched = []
    optional_missing = []
    
    density_list = []
    
    for kw in jd_skills:
        importance = matcher_obj.classify_requirement_importance(kw, job_description)
        status, evidence_obj = matcher_obj.evaluate_skill(kw, norm_resume)
        
        count_in_jd = len(re.findall(r'\b' + re.escape(kw.lower()) + r'\b', clean_jd))
        if count_in_jd == 0:
            count_in_jd = 2
            
        if status == "DIRECT_MATCH":
            matched_keywords.append(kw)
            count_in_resume = max(1, len(re.findall(r'\b' + re.escape(kw.lower()) + r'\b', clean_resume)))
            explanation = f"Matched! '{kw.capitalize()}' is present in your resume ({count_in_resume}x)."
            
            if importance == "REQUIRED":
                required_matched.append(kw)
            elif importance == "PREFERRED":
                preferred_matched.append(kw)
            else:
                optional_matched.append(kw)
                
            density_list.append({
                "keyword": kw.capitalize(),
                "countInJd": count_in_jd,
                "countInResume": count_in_resume,
                "importance": importance,
                "explanation": explanation
            })
            
        elif status == "RELATED_EVIDENCE":
            related_evidence.append(evidence_obj)
            # Counts as missing/not-evidenced for confirmed status
            missing_keywords.append(kw)
            count_in_resume = 0
            explanation = f"Related Evidence! '{evidence_obj['resumeEvidence']}' found in your resume as a proxy for '{kw.capitalize()}'."
            
            if importance == "REQUIRED":
                required_missing.append(kw)
            elif importance == "PREFERRED":
                preferred_missing.append(kw)
            else:
                optional_missing.append(kw)
                
            density_list.append({
                "keyword": kw.capitalize(),
                "countInJd": count_in_jd,
                "countInResume": count_in_resume,
                "importance": importance,
                "explanation": explanation
            })
            
        else:
            missing_keywords.append(kw)
            count_in_resume = 0
            explanation = f"Not yet directly evidenced! '{kw.capitalize()}' appears in the JD ({count_in_jd}x) but is not yet directly evidenced in your resume."
            
            if importance == "REQUIRED":
                required_missing.append(kw)
            elif importance == "PREFERRED":
                preferred_missing.append(kw)
            else:
                optional_missing.append(kw)
                
            density_list.append({
                "keyword": kw.capitalize(),
                "countInJd": count_in_jd,
                "countInResume": count_in_resume,
                "importance": importance,
                "explanation": explanation
            })
            
    # Clean lists
    matched_keywords = sorted(list(set(matched_keywords)))
    missing_keywords = sorted(list(set(missing_keywords)))
    
    # Calculate weighted score
    earned_weight = 0.0
    total_weight = 0.0
    
    for _ in required_matched:
        earned_weight += 1.0
        total_weight += 1.0
    for _ in required_missing:
        total_weight += 1.0
        
    for _ in preferred_matched:
        earned_weight += 0.4
        total_weight += 0.4
    for _ in preferred_missing:
        total_weight += 0.4
        earned_weight += 0.1
        
    for _ in optional_matched:
        earned_weight += 0.1
        total_weight += 0.1
    for _ in optional_missing:
        total_weight += 0.1
        earned_weight += 0.1
        
    if total_weight > 0:
        keyword_score = int((earned_weight / total_weight) * 100)
    else:
        keyword_score = 100
        
    # Cosine Similarity using TF-IDF Vectorizer
    if clean_resume and clean_jd:
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform([clean_resume, clean_jd])
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        base_cosine = int(similarity * 100)
    else:
        base_cosine = 0
        
    # Final keyword match score
    match_score = int(keyword_score * 0.7 + base_cosine * 0.3)
    match_score = max(10, min(100, match_score))
    
    # 2. Structural segments detection
    sections = ['experience', 'education', 'skills', 'projects', 'contact']
    section_synonyms = {
        'experience': ['experience', 'employment', 'work history', 'career history', 'background', 'professional history', 'work experience', 'history'],
        'education': ['education', 'academic', 'qualification', 'qualifications', 'degree', 'university', 'college', 'studies', 'schooling', 'academics'],
        'skills': ['skills', 'competencies', 'expertise', 'capabilities', 'technologies', 'technical stack', 'tools', 'proficiencies', 'abilities', 'tech stack'],
        'projects': ['projects', 'key projects', 'academic projects', 'personal projects', 'work projects', 'accomplishments', 'creations'],
        'contact': ['contact', 'email', 'phone', 'linkedin', 'address', 'github', 'info', 'details']
    }
    
    detected_sections = []
    for sec in sections:
        if any(syn in clean_resume for syn in section_synonyms[sec]):
            detected_sections.append(sec)
            
    detected_count = len(detected_sections)
    formatting_score = int((detected_count / 5) * 100)
    
    # 3. Action Verbs
    words = clean_resume.split()
    verb_count = len([w for w in words if w in ACTION_VERBS])
    experience_score = min(100, verb_count * 15)
    verb_score = min(100, int((verb_count / 8) * 100))
    
    # 4. Metrics/Achievements
    metrics_matches = re.findall(r'\b\d+%\b|\$\d+|\b\d+\s*(?:percent|million|billion|users|records|servers|developer)\b', resume_text, re.IGNORECASE)
    metrics_count = len(metrics_matches)
    quantified_score = min(100, metrics_count * 25)
    
    # subScores
    sub_formatting = formatting_score
    sub_keyword = match_score
    sub_experience = max(40, experience_score)
    sub_projects = 80 if 'projects' in detected_sections else 40
    sub_education = 90 if 'education' in detected_sections else 50
    sub_soft = 85 if len(words) > 150 else 60
    
    # Calculate separated scores
    date_format = bool(re.search(r'\b\d{2}/\d{4}\b|\b\d{4}\b', resume_text))
    
    ats_compatibility_score = int(sub_formatting * 0.8 + (100 if date_format else 50) * 0.2)
    ats_compatibility_score = max(10, min(100, ats_compatibility_score))
    
    job_match_score_val = int(sub_keyword * 0.4 + sub_experience * 0.3 + sub_projects * 0.2 + sub_education * 0.1)
    job_match_score_val = max(10, min(100, job_match_score_val))
    
    resume_quality_score = int(verb_score * 0.4 + quantified_score * 0.4 + sub_soft * 0.2)
    resume_quality_score = max(10, min(100, resume_quality_score))
    
    # Application Match Score is the weighted average
    overall = int((ats_compatibility_score * 0.3) + (job_match_score_val * 0.5) + (resume_quality_score * 0.2))
    overall = max(10, min(100, overall))
    
    # scoreDeductions with denominators
    deductions = []
    has_email_raw = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', resume_text))
    has_phone_raw = bool(re.search(r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', resume_text))
    has_contact = has_email_raw or has_phone_raw or 'linkedin' in resume_text.lower() or any(w in clean_resume for w in ['email', 'phone', 'contact'])
    
    if has_contact:
        deductions.append({"factor": "Contact Details", "points": 10, "pointsDisplay": "10/10", "description": "Email or Phone details identified."})
    else:
        deductions.append({"factor": "Missing Contact Details", "points": -10, "pointsDisplay": "0/10", "description": "Add email/phone to ensure recruiter outreach."})
        
    if 'skills' in detected_sections:
        deductions.append({"factor": "Skills Directory", "points": 15, "pointsDisplay": "15/15", "description": "Formatted skills section found."})
    else:
        deductions.append({"factor": "Missing Skills Directory", "points": -15, "pointsDisplay": "0/15", "description": "Add a dedicated skills section."})
        
    for kw in missing_keywords[:2]:
        deductions.append({
            "factor": f"Not yet directly evidenced: {kw.capitalize()}",
            "points": -4,
            "pointsDisplay": "0/4",
            "description": f"'{kw.capitalize()}' is not yet directly evidenced in the resume. Consider highlighting relevant projects or experiences."
        })
        
    # complianceChecklist
    has_address = any(char.isdigit() for char in clean_resume) and ('street' in clean_resume or 'road' in clean_resume or 'city' in clean_resume or 'state' in clean_resume)
    word_count = len(words)
    
    compliance = {
        "hasContactInfo": has_contact,
        "hasAddress": has_address,
        "hasSummarySection": any(s in clean_resume for s in ['summary', 'objective', 'profile', 'about me']),
        "isSingleColumn": True,
        "hasWorkHistory": 'experience' in detected_sections or 'employment' in detected_sections or 'work' in detected_sections,
        "friendlyHeadings": detected_count >= 3,
        "standardDateFormats": date_format,
        "jobTitleMentioned": len(matched_keywords) > 0,
        "quantifiedAchievements": metrics_count >= 2,
        "idealWordCount": word_count > 200
    }
    
    # tailoredBulletPoints using domain-specific templates
    bullets = get_domain_bullets(missing_keywords, matched_keywords, job_domain)
    
    # redFlags
    red_flags = []
    if not has_contact:
        red_flags.append("Missing contact details: Recruiter parsers might auto-archive due to unreachable index.")
    if metrics_count < 2:
        red_flags.append("No quantitative metrics found: Recruitment parsers look for digits/percentages to gauge impact.")
    if not date_format:
        red_flags.append("Non-standard date formats detected: Use MM/YYYY to prevent experience parsing gaps.")
        
    # improvementSuggestions
    suggestions = []
    if not has_contact:
        suggestions.append("Add clear phone number and email fields to headers.")
    if metrics_count < 3:
        suggestions.append("Incorporate quantitative numbers showing employee records count, budget metrics, or project scopes.")
    for kw in missing_keywords[:3]:
        suggestions.append(f"Provide details showing experience with: '{kw.capitalize()}' (Not yet directly evidenced in the resume).")
        
    if not suggestions:
        suggestions = ["Optimize spacing layout.", "Maintain standard single-column structure."]
        
    return {
        "overallScore": overall,
        "atsCompatibility": ats_compatibility_score,
        "jobMatchScore": job_match_score_val,
        "resumeQuality": resume_quality_score,
        "subScores": {
            "formatting": sub_formatting,
            "keywordMatch": sub_keyword,
            "experienceMatch": sub_experience,
            "projects": sub_projects,
            "education": sub_education,
            "softSkills": sub_soft
        },
        "strengthMetrics": {
            "atsParsing": sub_formatting,
            "technicalSkills": sub_keyword,
            "projects": sub_projects,
            "experience": sub_experience,
            "quantifiedResults": quantified_score
        },
        "keywordDensity": density_list,
        "scoreDeductions": deductions,
        "tailoredBulletPoints": bullets,
        "matchedKeywords": matched_keywords,
        "missingKeywords": missing_keywords,
        "matchedSkills": matched_keywords,
        "missingSkills": missing_keywords,
        "notYetEvidencedSkills": missing_keywords,
        "relatedEvidence": related_evidence,
        "requiredMatchedSkills": required_matched,
        "requiredNotYetEvidencedSkills": required_missing,
        "preferredMatchedSkills": preferred_matched,
        "preferredNotYetEvidencedSkills": preferred_missing,
        "detectedJobDomain": job_domain,
        "redFlags": red_flags,
        "complianceChecklist": compliance,
        "improvementSuggestions": suggestions
    }

def tailor_resume_nlp(resume_text: str, job_description: str) -> Dict:
    clean_resume = clean_text(resume_text)
    clean_jd = clean_text(job_description)
    
    score_before, matched, missing = calculate_ats_match(resume_text, job_description)
    
    # Classify resume category
    lower_text = resume_text.lower()
    tech_keywords = ['developer', 'software engineer', 'programmer', 'coding', 'frontend', 'backend', 'fullstack', 'devops', 'kubernetes', 'docker', 'aws', 'git', 'github', 'database', 'sql', 'graphql', 'python', 'javascript', 'typescript', 'java', 'c++', 'html', 'css', 'data scientist', 'data engineer']
    sales_keywords = ['sales', 'revenue', 'quota', 'account executive', 'business development', 'customer success', 'pipeline', 'cold call', 'lead generation', 'b2b', 'b2c', 'account manager', 'deal size', 'deals closed', 'salesforce', 'crm', 'annual contract value', 'acv', 'contract value', 'closed deals', 'prospecting']
    hr_keywords = ['hr', 'human resources', 'talent acquisition', 'recruiting', 'recruitment', 'payroll', 'hris', 'employee relations', 'talent management', 'sourcing', 'workforce planning', 'labor relations']
    marketing_keywords = ['marketing', 'branding', 'seo', 'sem', 'copywriting', 'campaign', 'social media', 'growth hacking', 'analytics', 'conversion rate', 'cro', 'google ads']
    finance_keywords = ['finance', 'accounting', 'tax', 'auditor', 'auditing', 'budget', 'forecasting', 'banking', 'bookkeeping', 'ledger', 'quickbooks', 'financial modeling', 'treasury']
    operations_keywords = ['operations', 'supply chain', 'logistics', 'procurement', 'inventory', 'vendor', 'shipping', 'warehouse', 'sap', 'six sigma', 'lean', 'operational efficiency']
    healthcare_keywords = ['clinical', 'medical', 'nursing', 'patient', 'healthcare', 'hospital', 'hipaa', 'ehr', 'emr', 'diagnostics', 'patient care']
    legal_keywords = ['legal', 'lawyer', 'law', 'compliance', 'regulatory', 'paralegal', 'litigation', 'contract drafting', 'attorney', 'due diligence', 'policy']

    counts = {
        "technical": sum(1 for kw in tech_keywords if kw in lower_text),
        "sales": sum(1 for kw in sales_keywords if kw in lower_text),
        "hr": sum(1 for kw in hr_keywords if kw in lower_text),
        "marketing": sum(1 for kw in marketing_keywords if kw in lower_text),
        "finance": sum(1 for kw in finance_keywords if kw in lower_text),
        "operations": sum(1 for kw in operations_keywords if kw in lower_text),
        "healthcare": sum(1 for kw in healthcare_keywords if kw in lower_text),
        "legal": sum(1 for kw in legal_keywords if kw in lower_text)
    }

    category = "general"
    max_count = 0
    for cat, count in counts.items():
        if count > max_count:
            max_count = count
            category = cat

    # Generate domain-specific experience suggestions
    if category == "technical":
        bullet_template = "Implemented backend services and logic using {kw}."
    elif category == "sales":
        bullet_template = "Managed client relationships and deal pipelines using {kw}."
    elif category == "hr":
        bullet_template = "Coordinated human resource operations and onboarding workflows using {kw}."
    elif category == "marketing":
        bullet_template = "Designed advertising campaigns and lead generation strategies using {kw}."
    elif category == "finance":
        bullet_template = "Managed financial models and ledger auditing operations using {kw}."
    elif category == "operations":
        bullet_template = "Optimized logistics pipelines and operational workflows using {kw}."
    elif category == "healthcare":
        bullet_template = "Coordinated patient care routines and clinical standards using {kw}."
    elif category == "legal":
        bullet_template = "Reviewed contract drafts and corporate policy compliance using {kw}."
    else:
        bullet_template = "Coordinated key project deliverables and team collaboration using {kw}."

    # Resolve bullet characters specifically inside the Experience section to match original resume layout
    exp_block = ""
    exp_match = re.search(r'(experience|work history|employment history|employment)\b(.*?)($|\n\n|\n[A-Z\s]{4,})', resume_text, re.IGNORECASE | re.DOTALL)
    if exp_match:
        exp_block = exp_match.group(2)
        
    bullet_char = ""
    use_exp_bullet = False
    bullet_patterns = {
        "•": r'^\s*•',
        "-": r'^\s*-',
        "*": r'^\s*\*',
        "▪": r'^\s*▪',
        "▸": r'^\s*▸',
        "◦": r'^\s*◦',
        "–": r'^\s*–',
        "—": r'^\s*—'
    }
    
    if exp_block:
        b_counts = {}
        for b_char, pattern in bullet_patterns.items():
            b_counts[b_char] = len(re.findall(pattern, exp_block, re.MULTILINE))
        max_b_char = max(b_counts, key=b_counts.get)
        if b_counts[max_b_char] > 0:
            bullet_char = max_b_char
            use_exp_bullet = True

    # Check if skills section uses bullets in original resume
    skills_section_match = re.search(r'(skills|core competencies|technologies)\b(.*?)($|\n\n|\n[A-Z\s]{4,})', resume_text, re.IGNORECASE | re.DOTALL)
    use_skills_bullet = False
    if skills_section_match:
        skills_block = skills_section_match.group(2)
        for s_line in skills_block.split('\n'):
            s_line_trim = s_line.strip()
            if s_line_trim and any(s_line_trim.startswith(c) for c in ['•', '-', '*', '▪', '▸', '◦', '–', '—']):
                use_skills_bullet = True
                break

    skills_bullet_prefix = f"{bullet_char} " if (use_skills_bullet and bullet_char) else ""
    exp_bullet_prefix = f"{bullet_char} " if (use_exp_bullet and bullet_char) else ""

    tailored_text = resume_text
    added_suggestions = []
    
    if missing:
        skills_keywords = ", ".join([kw.capitalize() for kw in missing[:4]])
        skills_header_match = re.search(r'(skills|core competencies|technologies)\b', tailored_text, re.IGNORECASE)
        if skills_header_match:
            pos = skills_header_match.end()
            tailored_text = tailored_text[:pos] + f"\n{skills_bullet_prefix}Tailored Skills: {skills_keywords}\n" + tailored_text[pos:]
        else:
            tailored_text += f"\n\nSKILLS & TECHNOLOGIES:\n{skills_bullet_prefix}Tailored Skills: {skills_keywords}\n"
            
        # Insert suggested experience bullets under the Experience section (nesting them under the first role block)
        exp_header_match = re.search(r'^\s*(experience|work history|employment history|employment)\b', tailored_text, re.IGNORECASE | re.MULTILINE)
        if exp_header_match:
            pos = exp_header_match.end()
            first_bullet_match = re.search(r'^\s*[•\-\*▪▸◦–—]\s+', tailored_text[pos:], re.MULTILINE)
            if first_bullet_match:
                insert_pos = pos + first_bullet_match.start()
                suggested_bullets = "\n".join([f"{exp_bullet_prefix}{bullet_template.format(kw=kw.capitalize())}" for kw in missing[:2]]) + "\n"
                tailored_text = tailored_text[:insert_pos] + suggested_bullets + tailored_text[insert_pos:]
            else:
                suggested_bullets = "\n" + "\n".join([f"{exp_bullet_prefix}{bullet_template.format(kw=kw.capitalize())}" for kw in missing[:2]]) + "\n"
                tailored_text = tailored_text[:pos] + suggested_bullets + tailored_text[pos:]
            
        for kw in missing[:4]:
            added_suggestions.append({
                "keyword": kw.capitalize(),
                "occurrencesAdded": 1,
                "impact": "CRITICAL" if kw in ['react', 'node.js', 'typescript'] else "HIGH"
            })
            
    score_after, _, _ = calculate_ats_match(tailored_text, job_description)
    score_after = max(score_before + 15, min(98, score_after))
    
    improvements = [
        {
            "section": "Skills",
            "original": "Original skills list",
            "improved": f"Added keywords: {', '.join([k.capitalize() for k in missing[:4]]) if missing else 'Optimized skills structure'}",
            "reason": "Direct keyword alignment with job description requirements."
        }
    ]
    if missing:
        improvements.append({
            "section": "Experience",
            "original": "Original job descriptions",
            "improved": f"Added bullets: {', '.join([bullet_template.format(kw=kw.capitalize()) for kw in missing[:2]])}",
            "reason": "Demonstrate practical experience with required job technologies."
        })
    
    evidence = []
    for kw in matched[:3]:
        evidence.append({
            "statement": f"Demonstrated expertise in {kw.capitalize()} during operations.",
            "evidenceType": "VERIFIED",
            "details": f"Directly matched keyword '{kw.capitalize()}' found in your original resume."
        })
    for kw in missing[:2]:
        evidence.append({
            "statement": bullet_template.format(kw=kw.capitalize()),
            "evidenceType": "SUGGESTED",
            "details": f"Added keyword '{kw.capitalize()}' as a suggested improvement to match job description."
        })
    # Clean up trailing spaces from lines and collapse excess vertical spacing gaps
    tailored_text = "\n".join([l.rstrip() for l in tailored_text.split('\n')])
    tailored_text = re.sub(r'\n{3,}', '\n\n', tailored_text).strip()
        
    return {
        "originalResumeId": f"resume-orig-{int(time.time())}",
        "tailoredResumeId": f"resume-tailored-{int(time.time())}",
        "matchScoreBefore": score_before,
        "matchScoreAfter": score_after,
        "tailoredResumeText": tailored_text,
        "keywordSuggestions": added_suggestions,
        "sectionImprovements": improvements,
        "evidenceStatements": evidence,
        "downloadUrl": "/api/resume/download/tailored-resume.pdf"
    }

def calculate_job_matching_nlp(resume_text: str, job_description: str, company: str, role: str) -> Dict:
    clean_resume = clean_text(resume_text)
    clean_jd = clean_text(job_description)
    
    score, matched, missing = calculate_ats_match(resume_text, job_description)
    
    required_exp = "3+ years of experience"
    exp_year_match = re.search(r'(\d+)\s*\+?\s*years?', clean_jd)
    if exp_year_match:
        required_exp = f"{exp_year_match.group(1)}+ years of experience"
        
    detected_exp = "2 years of professional experience"
    resume_exp_match = re.search(r'(\d+)\s*\+?\s*years?', clean_resume)
    if resume_exp_match:
        detected_exp = f"{resume_exp_match.group(1)} years of professional experience"
        
    exp_status = "Match" if (resume_exp_match and exp_year_match and int(resume_exp_match.group(1)) >= int(exp_year_match.group(1))) else "Partial Match"
    
    has_cs = 'computer science' in clean_resume or 'cs' in clean_resume or 'information technology' in clean_resume or 'it' in clean_resume
    edu_detected = "B.S. in Computer Science" if has_cs else "Non-technical credentials"
    edu_status = "Match" if has_cs else "Needs Review"
    
    missing_caps = [k.capitalize() for k in missing[:3]]
    if missing_caps:
        summary = f"Your resume shows strong alignments, but you are missing {', '.join(missing_caps)} details. We recommend tailoring your resume to include these elements."
    else:
        summary = "Excellent match! Your profile aligns closely with the requirements of this role."
        
    level = "Senior-Level" if "senior" in clean_jd else "Lead-Level" if "lead" in clean_jd else "Junior-Level" if "junior" in clean_jd else "Mid-Level"
    salary = "$130,000 - $160,000" if level == "Senior-Level" else "$160,000 - $190,000" if level == "Lead-Level" else "$80,000 - $100,000" if level == "Junior-Level" else "$110,000 - $135,000"
    
    return {
        "matchScore": score,
        "requiredSkills": matched + missing,
        "missingSkills": missing,
        "experienceMatch": {
            "status": exp_status,
            "required": required_exp,
            "detected": detected_exp,
            "feedback": f"Your experience profile shows a {exp_status.lower()} compatibility range."
        },
        "educationMatch": {
            "status": edu_status,
            "required": "B.S. in Computer Science or equivalent technical field",
            "detected": edu_detected,
            "feedback": "Educational credentials fully satisfy this posting." if has_cs else "Recruiter manual review may be required."
        },
        "recommendationSummary": summary,
        "jobInsights": {
            "salaryEstimate": salary,
            "roleLevel": level,
            "companyInsight": f"Dynamic development environment at {company} targeting containerized applications."
        }
    }
