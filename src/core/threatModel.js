// A short, plain threat model. The README repeats it. Keep the two in step.

export const THREAT_MODEL = {
  summary:
    'The prototype tries to stop a buyer learning about individual farmers through the query portal, and to stop data being used for purposes farmers did not allow. It assumes the trust, the cooperatives and the browser running this code are honest and uncompromised.',
  adversaries: [
    {
      name: 'Curious buyer',
      goal: 'Learn one farmer\'s yield, price or location by adding filters until a group of one remains.',
      defence: 'Every group must contain at least k consenting farmers (default 10). Filters use coarse attributes only and never identifiers. Counts are protected too, so a buyer cannot probe whether a person exists.',
    },
    {
      name: 'Repeating buyer',
      goal: 'Ask almost the same question twice and subtract the answers to isolate individuals. A consent withdrawal between two queries has the same effect.',
      defence: 'For the same kind of data, a new answer is refused if the farmers behind it differ from the farmers behind any earlier answer to the same buyer by more than zero and fewer than k.',
    },
    {
      name: 'Purpose-creeping buyer',
      goal: 'Use data for a purpose the buyer is not approved for, or that farmers did not agree to.',
      defence: 'Three separate gates: the buyer must be approved for the purpose, the question must fit the purpose, and each farmer\'s consent is held per data category and per purpose.',
    },
  ],
  assumptions: [
    'The trust, cooperative staff and the browser running this code are trusted. There is no authentication; the role switcher is a demonstration aid.',
    'The data is synthetic and held in memory and localStorage. Nothing is encrypted or access controlled.',
    'Buyers see only the portal. They have no other route to the data.',
  ],
  outOfScope: [
    'Homogeneous groups. If every farmer in a large enough group has the same value, the aggregate reveals it. The harness records this as a known gap.',
    'Colluding buyers. The differencing guard works per buyer, so two buyers can pool their answers. The harness records this as a known gap.',
    'Combining many queries. The guard compares pairs of answers. It does not stop an attacker who solves equations across many overlapping answers.',
    'Formal privacy guarantees. There is no differential privacy and no noise. The controls are heuristics.',
    'Refusals as a signal. A refusal can itself tell a buyer that a group is small or that its membership changed. Messages avoid exact numbers but cannot remove this.',
    'Network, device and insider attacks, and anything about real deployment such as key management or legal agreements.',
  ],
};
