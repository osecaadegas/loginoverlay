export const compactEditablePreviewData = Object.freeze({
  states: Object.freeze(['with_requests', 'empty', 'busy_queue', 'missing_image']),
  frame: Object.freeze({ width: 560, height: 120 }),
  sampleRequests: Object.freeze([
    Object.freeze({
      id: 'editable-preview-sr-1',
      slot_name: 'Gates of Olympus 1000',
      slot_image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/GatesOfOlympus1000.png',
      requested_by: 'brutuspolus',
    }),
    Object.freeze({
      id: 'editable-preview-sr-2',
      slot_name: 'Le Digger',
      slot_image: 'https://images-cdn.softswiss.net/i/s2/hacksaw/LeDigger.png',
      requested_by: 'miguel',
    }),
    Object.freeze({
      id: 'editable-preview-sr-3',
      slot_name: 'Big Bass Secrets of the Golden Lake',
      slot_image: 'https://images-cdn.softswiss.net/i/s2/pragmaticplay/BigBassSecretsOfTheGoldenLake.png',
      requested_by: 'viewer_42',
    }),
  ]),
});

export default compactEditablePreviewData;
