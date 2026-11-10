// WebMCP: read-only tools that let an AI agent in the browser learn about Victor.
// Experimental browser API (https://webmachinelearning.github.io/webmcp/).
// In browsers without it, this file does nothing.
(function () {
  var mc = (document && document.modelContext) || (navigator && navigator.modelContext);
  if (!mc || typeof mc.registerTool !== 'function') return;

  var SITE = 'https://vb-pm.vdb1.workers.dev';
  var LINKEDIN = 'https://www.linkedin.com/in/victor-vanden-bussche-24b4182b4/';

  var profile = {
    name: 'Victor Vanden Bussche',
    headline: 'Industrial product designer moving into product management and business development.',
    lookingFor: 'An internship or apprenticeship in product management or business development, ideally for physical products.',
    education: [
      { when: 'Now', what: 'MSc Product Management & UX Design', where: 'SKEMA Business School and Politecnico di Milano' },
      { when: '2024-2025', what: 'Pre-master Industrial Engineering', where: 'Ghent University' },
      { when: '2021-2024', what: 'Bachelor Industrial Product Design', where: 'Howest, Kortrijk (Erasmus at Chalmers, Sweden)' }
    ],
    experience: [
      { when: '2026', role: 'Business Development Intern', org: 'Sumum', detail: 'Cost price analyses, competitor benchmarks, presented a new switch range to customers at 3 Days of Design, Copenhagen.' },
      { when: '2025', role: 'Coordinator', org: 'U pop up, interior design showroom' },
      { when: '2025', role: 'CAD Designer', org: 'Sumum' },
      { when: '2024', role: 'Junior Industrial Product Developer', org: 'My Add On', detail: 'Developed MyRamp, bachelor thesis graded 16/20.' }
    ],
    toolkit: {
      businessAndData: ['Microsoft Office', 'Power BI'],
      productAndUx: ['Figma', 'Miro'],
      aiAndCode: ['ChatGPT', 'Gemini', 'Claude Code', 'Google Colab'],
      cadAnd3d: ['Siemens NX', 'Autodesk Inventor', 'Rhino', 'Grasshopper (basics)'],
      languages: ['Dutch', 'English', 'French']
    },
    pages: { about: SITE + '/about', work: SITE + '/work', contact: SITE + '/contact' }
  };

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

  var pagesEnum = ['home', 'work', 'about', 'contact', 'myramp', 'backplate'];
  var tools = [
    { name: 'get_profile',
      description: "Victor's profile: who he is, what he is looking for, education, experience and toolkit.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () { return text(profile); } },
    { name: 'list_projects',
      description: "Victor's product design projects, each with problem, approach, result and a link.",
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () { return text(projects); } },
    { name: 'get_contact',
      description: 'How to contact Victor about an internship or apprenticeship.',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: function () { return text({ linkedin: LINKEDIN, email: 'victor.vdbussche.idesign@gmail.com', contactPage: SITE + '/contact' }); } },
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
