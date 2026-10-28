// Line drawings in the style of an engineering sketch. They are decoration (aria-hidden) and are
// deliberately schematic: a tube and a tube bend, never a picture of a particular machine.

// A 90° tube bend with its centre line, bend radius and diameter marks. Used in the home hero.
export function TubeBendDrawing() {
  return (
    <svg viewBox="0 0 480 420" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {/* Outer and inner walls: vertical leg, bend, horizontal leg. */}
        <path d="M92 400V200A148 148 0 0 1 240 52H470" />
        <path d="M148 400V200A92 92 0 0 1 240 108H470" />
        {/* Open ends. */}
        <ellipse cx="120" cy="400" rx="28" ry="8" />
        <ellipse cx="120" cy="400" rx="21" ry="5.5" />
        <ellipse cx="470" cy="80" rx="9" ry="28" />
        <ellipse cx="470" cy="80" rx="6" ry="21" />
      </g>
      <g stroke="currentColor" strokeWidth="1.25" opacity="0.6">
        {/* Centre line. */}
        <path d="M120 412V200A120 120 0 0 1 240 80H476" strokeDasharray="14 5 3 5" />
        {/* Bend centre. */}
        <path d="M232 200h16M240 192v16" />
      </g>
      <g stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
        {/* Bend radius, from the centre to the centre line. */}
        <path d="M240 200 155.1 115.1" />
        <path d="m155.1 115.1 10 3.2-6.8 6.8z" fill="var(--color-accent)" />
        {/* Tube diameter across the horizontal leg. */}
        <path d="M400 40v80M392 52h16M392 108h16" opacity="0.9" />
        <path d="m400 52-4 9h8zM400 108l-4-9h8z" fill="var(--color-accent)" />
      </g>
      <g fill="var(--color-accent)" fontFamily="inherit" fontSize="20" fontWeight="700">
        <text x="200" y="150">R</text>
        <text x="412" y="36">Ø</text>
      </g>
    </svg>
  );
}

// A straight length of tube with its centre line: the placeholder until a machine has photos.
export function TubeDrawing() {
  return (
    <svg viewBox="0 0 400 300" fill="none" aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M86 118H300M86 182H300" />
        <ellipse cx="86" cy="150" rx="15" ry="32" />
        <ellipse cx="86" cy="150" rx="10.5" ry="23" />
        <path d="M300 118a15 32 0 0 1 0 64" />
      </g>
      <g stroke="currentColor" strokeWidth="1.25" opacity="0.55">
        <path d="M52 150H336" strokeDasharray="14 5 3 5" />
      </g>
      <g stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round">
        <path d="M250 96v108M243 118h14M243 182h14" />
        <path d="m250 118-3.5 8h7zM250 182l-3.5-8h7z" fill="var(--color-accent)" />
      </g>
      <text x="258" y="100" fill="var(--color-accent)" fontFamily="inherit" fontSize="17" fontWeight="700">
        Ø
      </text>
    </svg>
  );
}
