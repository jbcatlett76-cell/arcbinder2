import { describe, expect, it } from 'vitest';
import { parseOutline } from '../outlineParser';

const outline = `
Part I: The Return
Chapter 1: Homecoming
Summary: Mara returns to the harbor after nineteen years.
Scene 1: The Station
POV: Mara
Location: Bellweather Station
- Mara steps off the last train.
- She notices her father's coat in the crowd.
Scene 2: The Hotel
- The hotel door is already open.

Chapter 2: The Signal
Scene 1: The Lighthouse
- The dead receiver comes alive.
- A voice says Mara's name.
`;

describe('parseOutline', () => {
  it('creates chapters, scenes, beats, and scene metadata', () => {
    const chapters = parseOutline(outline);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toContain('Chapter 1');
    expect(chapters[0].scenes).toHaveLength(2);
    expect(chapters[0].scenes[0].pov).toBe('Mara');
    expect(chapters[0].scenes[0].location).toBe('Bellweather Station');
    expect(chapters[0].scenes[0].beats).toHaveLength(2);
    expect(chapters[1].scenes[0].beats[1].text).toContain("Mara's name");
  });

  it('creates a usable structure from plain text', () => {
    const chapters = parseOutline('A stranger arrives.\nThe town refuses to speak.');
    expect(chapters).toHaveLength(1);
    expect(chapters[0].scenes).toHaveLength(1);
    expect(chapters[0].scenes[0].summary).toBe('A stranger arrives.');
    expect(chapters[0].scenes[0].beats[0].text).toBe('The town refuses to speak.');
  });
});
