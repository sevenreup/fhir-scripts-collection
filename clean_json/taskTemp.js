const taskTemplate = {
  resourceType: "Task",
  meta: {
    tag: [
      {
        system: "https://d-tree.org",
        code: "clinic-visit-task-order-2",
      },
    ],
  },
  status: "ready",
  intent: "plan",
  priority: "routine",
  description: "Viral Load Collection",
  executionPeriod: {
    start: "2023-08-31T10:03:35+02:00",
    end: "2023-11-23T11:10:34.227+03:00",
  },
  authoredOn: "2023-08-31T10:03:35+02:00",
  lastModified: "2023-08-31T10:03:35+02:00",
  reasonReference: {
    reference: "Questionnaire/art-client-viral-load-collection",
    display: "Viral Load Collection",
  },
};

module.exports = taskTemplate;
