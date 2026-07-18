import { Link } from 'react-router-dom';
import { BookOpenCheck, BrainCircuit, FileDown, GitBranch, LibraryBig, Sparkles } from 'lucide-react';
import { Logo } from '../components/Logo';

const features = [
  { icon: GitBranch, title: 'Outline to manuscript', text: 'Import an outline and turn it into chapters, scenes, and beat-level writing plans.' },
  { icon: Sparkles, title: 'AI prose generation', text: 'Draft complete scenes from beats, then accept, revise, compare, or regenerate.' },
  { icon: LibraryBig, title: 'Living story bible', text: 'Keep characters, locations, lore, objects, and continuity connected to the manuscript.' },
  { icon: BrainCircuit, title: 'Project-aware AI', text: 'Use relevant project context instead of throwing the entire manuscript into every request.' },
  { icon: BookOpenCheck, title: 'Review and revise', text: 'Track word counts, chapter balance, scene status, and repeated language.' },
  { icon: FileDown, title: 'Publish-ready exports', text: 'Export project backups, Markdown, text, and real DOCX manuscripts.' },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Logo />
        <div className="landing-nav-links">
          <a href="#features">Features</a>
          <a href="#workflow">Workflow</a>
          <Link className="button button-ghost" to="/login">Sign in</Link>
          <Link className="button button-primary" to="/login">Start writing</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">From first idea to finished book</p>
          <h1>Your story, bound together.</h1>
          <p className="hero-lead">ArcBinder combines outlining, story development, AI prose writing, continuity, revision, and book production in one author-first workspace.</p>
          <div className="button-row">
            <Link className="button button-primary button-large" to="/login">Open ArcBinder</Link>
            <a className="button button-secondary button-large" href="#workflow">See the workflow</a>
          </div>
          <div className="hero-proof"><span>Bring your own AI key</span><span>Real outline import</span><span>Author-controlled generation</span></div>
        </div>
        <div className="hero-product" aria-label="ArcBinder workspace preview">
          <div className="mock-window-bar"><span /><span /><span /></div>
          <div className="mock-workspace">
            <aside>
              <small>THE GLASS HARBOR</small>
              <strong>Chapter 8</strong>
              <span className="active">Scene 2 · The Signal</span>
              <span>Scene 3 · Low Tide</span>
              <span>Scene 4 · The Door</span>
            </aside>
            <article>
              <p className="mock-kicker">SCENE TWO</p>
              <h3>The Signal</h3>
              <p>The receiver came alive at 2:17 in the morning, breathing static into the empty lighthouse.</p>
              <p>Mara stopped halfway down the iron stairs. Beneath the hiss, someone whispered her name.</p>
              <div className="mock-ai-card"><Sparkles size={15} /><span>Generate from 5 scene beats</span><button>Draft scene</button></div>
            </article>
            <section>
              <small>SCENE CONTEXT</small>
              <strong>Mara Vale</strong>
              <p>POV character · Knows the lighthouse has been abandoned for nineteen years.</p>
              <strong>Primary beat</strong>
              <p>The signal repeats a phrase her missing father used.</p>
            </section>
          </div>
        </div>
      </section>

      <section className="feature-section" id="features">
        <p className="eyebrow">One connected writing system</p>
        <h2>Planning and prose finally belong in the same place.</h2>
        <div className="feature-grid">
          {features.map(({ icon: Icon, title, text }) => (
            <article className="feature-card" key={title}><Icon size={23} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="workflow-section" id="workflow">
        <div><p className="eyebrow">The ArcBinder flow</p><h2>Stop rebuilding your book every time you change tools.</h2></div>
        <div className="workflow-line">
          {['Idea', 'Outline', 'Chapters', 'Scenes', 'Beats', 'Prose', 'Review', 'Publish'].map((item, index) => <span key={item}><b>{index + 1}</b>{item}</span>)}
        </div>
      </section>

      <footer className="landing-footer"><Logo /><p>Built for authors who want powerful AI without surrendering control of the story.</p></footer>
    </main>
  );
}
