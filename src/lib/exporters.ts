import { saveAs } from 'file-saver';
import type { Project } from '../types';

function safeFileName(value: string): string {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-|-$/g, '') || 'arcbinder-project';
}

export function manuscriptAsMarkdown(project: Project): string {
  const lines = [`# ${project.title}`, project.subtitle ? `## ${project.subtitle}` : '', project.author ? `**${project.author}**` : '', ''];
  for (const chapter of project.chapters) {
    lines.push(`# ${chapter.title}`, '');
    for (const scene of chapter.scenes) {
      if (scene.prose.trim()) lines.push(scene.prose.trim(), '');
      lines.push('***', '');
    }
  }
  return lines.filter((line, index) => line !== '***' || lines[index - 1] !== '').join('\n');
}

export function downloadText(project: Project, kind: 'md' | 'txt' | 'json'): void {
  const content = kind === 'json' ? JSON.stringify(project, null, 2) : manuscriptAsMarkdown(project);
  const type = kind === 'json' ? 'application/json' : 'text/plain;charset=utf-8';
  saveAs(new Blob([content], { type }), `${safeFileName(project.title)}.${kind}`);
}

export async function downloadDocx(project: Project): Promise<void> {
  const { Document, HeadingLevel, Packer, Paragraph } = await import('docx');
  const children = [
    new Paragraph({ text: project.title, heading: HeadingLevel.TITLE }),
    ...(project.subtitle ? [new Paragraph({ text: project.subtitle, heading: HeadingLevel.HEADING_2 })] : []),
    ...(project.author ? [new Paragraph({ text: project.author })] : []),
    new Paragraph({ text: '' }),
  ];

  for (const chapter of project.chapters) {
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1, pageBreakBefore: true }));
    for (const scene of chapter.scenes) {
      const paragraphs = scene.prose.split(/\n{2,}/).map((text) => text.trim()).filter(Boolean);
      for (const paragraph of paragraphs) children.push(new Paragraph({ text: paragraph }));
      if (paragraphs.length) children.push(new Paragraph({ text: '* * *' }));
    }
  }

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${safeFileName(project.title)}.docx`);
}

export function printManuscript(project: Project): void {
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    alert('Allow pop-ups to print or save the manuscript as PDF.');
    return;
  }

  const chapters = project.chapters.map((chapter) => {
    const prose = chapter.scenes
      .map((scene) => scene.prose.trim())
      .filter(Boolean)
      .map((text) => text.split(/\n{2,}/).map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`).join(''))
      .join('<div class="break">* * *</div>');
    return `<section class="chapter"><h1>${escapeHtml(chapter.title)}</h1>${prose}</section>`;
  }).join('');

  const closeScript = '</scr' + 'ipt>';
  popup.document.write(`<!doctype html><html><head><title>${escapeHtml(project.title)}</title><style>@page{margin:0.8in}body{font-family:Georgia,serif;color:#222;line-height:1.75;font-size:12pt}.title{height:75vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.title h1{font-size:30pt;margin:0 0 18px}.title p{font-size:14pt}.chapter{break-before:page}.chapter h1{text-align:center;margin:30vh 0 50px;font-size:21pt}.chapter p{text-indent:1.5em;margin:0 0 .35em}.break{text-align:center;margin:24px}</style></head><body><section class="title"><h1>${escapeHtml(project.title)}</h1><p>${escapeHtml(project.author)}</p></section>${chapters}<script>window.onload=()=>window.print()${closeScript}</body></html>`);
  popup.document.close();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character));
}
