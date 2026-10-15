export const PRODUCT_TRUTH = {
  identity: {
    brand: "VANTA",
    model: "MONOLITH",
    category: "Desktop Synthesizer",
    finish: "Graphite",
    productCount: 1,
    voiceCount: 8,
    synthesis: "Hybrid polyphonic",
  },
  claims: [
    "Sound, given mass.",
    "Two states. One continuum.",
    "Made to be moved.",
  ],
  configuration: {
    variants: "None",
    editions: "None",
    accessories: "None",
  },
  description:
    "A premium graphite desktop synthesizer built around continuous movement between SUB and FRACTURE.",
  sound: {
    sub: {
      name: "SUB",
      character: [
        "deep",
        "rounded",
        "fundamental-forward",
        "stable",
        "spacious",
      ],
    },
    fracture: {
      name: "FRACTURE",
      character: [
        "bright",
        "harmonically dense",
        "unstable",
        "angular",
        "textured",
      ],
    },
    morph:
      "MORPH continuously transforms multiple synthesis parameters between SUB and FRACTURE; it is not a preset switch, sample crossfade, volume blend, or renamed cutoff.",
  },
  architecture: {
    polyphony: "Eight voices",
    oscillators: "Two digital oscillators per voice",
    filter: "Resonant analog filter",
    envelope: "Per-voice ADSR envelope",
    modulation: "LFO and modulation routing",
    output: "Stereo drive and tone stages",
    storage: "Preset storage",
    morph: "Multi-parameter MORPH modulation",
  },
  physical: {
    dimensions: {
      widthMm: 360,
      depthMm: 210,
      heightMm: 80,
      display: "360 × 210 × 80 mm (W × D × H)",
    },
    enclosure: "Bead-blasted graphite aluminum",
    display: "High-contrast OLED",
    connections: [
      "Stereo L/R outputs",
      "Headphones",
      "Expression input",
      "MIDI In",
      "MIDI Out",
      "USB",
      "External power",
    ],
    panelControls: [
      "MORPH",
      "OSC",
      "MIX",
      "MOD",
      "LFO",
      "CUTOFF",
      "RESONANCE",
      "DRIVE",
      "TONE",
      "ATTACK",
      "DECAY",
      "SUSTAIN",
      "RELEASE",
    ],
    displayButtons: {
      count: 3,
      description: "Context-sensitive and unnamed in marketing copy",
    },
  },
} as const;

export type ProductTruth = typeof PRODUCT_TRUTH;
