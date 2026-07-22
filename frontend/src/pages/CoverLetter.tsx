import CoverLetterGenerator from '../components/CoverLetterGenerator';

export default function CoverLetter() {
  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h1>AI Cover Letter Generator</h1>
        <p>Instantly draft a personalized, highly tailored cover letter matching your professional profile and target job.</p>
      </header>
      
      <CoverLetterGenerator />
    </div>
  );
}
