export type Guide = {
  id: string;
  category: string;
  title: string;
  summary: string;
  sections: { id: string; heading: string; body: string }[];
};

export type QueueItem = {
  id: string;
  title: string;
  detail: string;
  state: 'pending' | 'acknowledged' | 'failed';
  createdAt: string;
};

export const guides: Guide[] = [
  {
    id: 'generator',
    category: 'Power',
    title: 'Portable generator startup',
    summary: 'A safe synthetic checklist for a generator that turns but does not start.',
    sections: [
      { id: 'generator-fuel', heading: 'Fuel and airflow', body: 'Check that the fuel valve is open, the tank contains fresh fuel, and the intake filter is not obstructed.' },
      { id: 'generator-e17', heading: 'Fault E17', body: 'Fault E17 means the starter sequence completed without stable ignition. Check the fuel valve, intake airflow, and spark indicator in that order.' },
      { id: 'generator-reset', heading: 'Reset sequence', body: 'Move the selector to STOP, wait ten seconds, clear the area around the intake, then retry once. Escalate repeated failures.' },
    ],
  },
  {
    id: 'water',
    category: 'Supplies',
    title: 'Water storage inspection',
    summary: 'Synthetic inspection steps for temporary water storage.',
    sections: [
      { id: 'water-seal', heading: 'Container seal', body: 'Inspect the lid seal for cracks, confirm the date label is readable, and keep containers elevated from standing water.' },
      { id: 'water-count', heading: 'Inventory count', body: 'Record the number of sealed containers and flag any container that is leaking, cloudy, or missing a label.' },
    ],
  },
  {
    id: 'radio',
    category: 'Communications',
    title: 'Radio communications check',
    summary: 'Synthetic steps for a local radio check when the internet is unavailable.',
    sections: [
      { id: 'radio-power', heading: 'Power and channel', body: 'Confirm the battery indicator is above half, select the assigned channel, and perform a short call-and-response test.' },
      { id: 'radio-log', heading: 'Message log', body: 'Write the time, sender, receiver, and message summary in the local log before attempting a relay.' },
    ],
  },
  {
    id: 'battery',
    category: 'Power',
    title: 'Battery bank troubleshooting',
    summary: 'Synthetic checks for a battery bank that reports low output.',
    sections: [
      { id: 'battery-cables', heading: 'Cable inspection', body: 'Inspect terminals for looseness or corrosion. Do not touch exposed conductors; isolate the bank before maintenance.' },
      { id: 'battery-load', heading: 'Load check', body: 'Record the displayed voltage, disconnect nonessential loads, and compare the reading with the local reference table.' },
    ],
  },
];

export const checklistItems = [
  'Confirm the work area is clear.',
  'Inspect fuel, airflow, and visible indicators.',
  'Record the observed fault code.',
  'Add a local service note.',
];

export const seedQuestion = 'Why is the generator showing E17?';
