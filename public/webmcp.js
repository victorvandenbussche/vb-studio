// WebMCP: read-only tools that let an AI agent in the browser explore Victor's projects.
// About and Contact are for people only, so they are not offered here.
// Experimental browser API (https://webmachinelearning.github.io/webmcp/).
// In browsers without it, this file does nothing.
(function () {
  var mc = (document && document.modelContext) || (navigator && navigator.modelContext);
  if (!mc || typeof mc.registerTool !== 'function') return;

  var SITE = 'https://vb-pm.vdb1.workers.dev';

  var projects = [
    { name: 'MyRamp', url: SITE + '/myramp', context: 'Bachelor thesis at My Add On, 2024',
      problem: 'Kerbs and steps stop active wheelchair users from going where they want, on their own.',
      approach: 'Concepts, prototypes and user testing, iterated with the INNOWIZ method.',
      result: 'A light, foldable aluminium ramp, tested with users. Thesis graded 16/20.' },
    { name: 'Backplate', url: SITE + '/backplate', context: 'Individual project',
      problem: 'Back supports come in standard sizes, while every back is different.',
      approach: 'A 3D scan of the back, turned into a parametric model in Rhino.',
      result: 'A personalised, 3D-printed back support with an open-cell structure.' }
  ];

  function text(obj) { return { content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] }; }

  var pagesEnum = ['home', 'work', 'myramp', 'backplate'];
  var tools = [
    { name: 'list_projects',
      description: "Victor's product design projects, each with problem, approach, result and a link.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () { return text(projects); } },
    { name: 'open_page',
      description: 'Open one of the pages of this site in the current tab.',
      inputSchema: { type: 'object', properties: { page: { type: 'string', enum: pagesEnum, description: 'Which page to open.' } }, required: ['page'] },
      execute: function (input) {
        var p = input && input.page;
        if (pagesEnum.indexOf(p) === -1) return text({ error: 'Unknown page. Use one of: ' + pagesEnum.join(', ') });
        window.location.href = p === 'home' ? '/' : '/' + p;
        return text({ opened: p });
      } }
  ];

  tools.forEach(function (t) {
    try {
      var r = mc.registerTool(t);
      if (r && typeof r.catch === 'function') r.catch(function () {});
    } catch (e) { /* an older or different WebMCP version: skip this tool */ }
  });
})();
