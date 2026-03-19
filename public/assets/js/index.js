document.addEventListener('DOMContentLoaded', () => {

  const dropdownDefinitions = {
    profile: `
      <p>
        Your profile is the single most important record for getting paid. It stores your legal name, artist name,
        contact details, payment routing, and identifiers used by registries and platforms. If your profile is incomplete
        or inconsistent across services, registrations fail, splits are wrong, and payments get delayed or lost.
        Complete this page with verified information so your name is recognized and money can find you.
      </p>
      <p><a href="profile.html" class="bubble-btn">Open Profile</a></p>
    `,

    manage: `
      <p>
        The Manage page is your operational command center. Use it to track releases, deadlines, collaborators, and
        distribution checklists. Artists who manage their workflow avoid missed release windows, forgotten registrations,
        and lost revenue. This page helps you move from chaos to consistent, professional releases that capture every dollar.
      </p>
      <p><a href="manage.html" class="bubble-btn">Open Manage</a></p>
    `,

    works: `
      <p>
        Your Works page holds songs, stems, versions, and metadata. Properly labeled files and complete metadata mean
        faster registrations, correct splits, and accurate royalty flows. Timestamp creations, record contributors, and
        prepare the evidence you need to claim ownership and earnings — this is where your catalog becomes defensible.
      </p>
      <p><a href="works.html" class="bubble-btn">Open Works Studio</a></p>
    `,

    docs: `
      <p>
        The Docs vault stores contracts, invoices, release forms, EPKs, and royalty statements. Keeping these documents
        secure and organized prevents legal disputes, speeds negotiations, and proves ownership when it matters. This
        page is your offline, private headquarters for the paperwork that protects your career.
      </p>
      <p><a href="documents.html" class="bubble-btn">Open Document Vault</a></p>
    `,

    glossary: `
      <p>
        The Glossary translates industry jargon into plain language — publishing, masters, mechanicals, sync, PROs, MLC,
        metadata, splits, and more. Knowing these terms prevents you from signing away rights you didn’t intend to and
        helps you register correctly so money finds you.
      </p>
      <p><a href="glossary.html" class="bubble-btn">Open Glossary</a></p>
    `
  };

  // inject content into the hidden dropdown containers
  const map = [
    { id: 'profile-content', key: 'profile' },
    { id: 'manage-content', key: 'manage' },
    { id: 'works-content', key: 'works' },
    { id: 'docs-content', key: 'docs' },
    { id: 'glossary-content', key: 'glossary' }
  ];

  map.forEach(item => {
    const el = document.getElementById(item.id);
    if (el) el.innerHTML = dropdownDefinitions[item.key];
  });

  // dropdown toggle behavior: header click toggles adjacent .dropdown-content
  document.querySelectorAll('.dropdown-header').forEach(header => {
    header.style.cursor = 'pointer';
    header.addEventListener('click', () => {
      const content = header.nextElementSibling;
      if (!content) return;
      const isHidden = content.hasAttribute('hidden');
      if (isHidden) {
        content.removeAttribute('hidden');
        content.style.display = 'block';
      } else {
        content.setAttribute('hidden', '');
        content.style.display = 'none';
      }
    });
  });

  // burger menu toggle
  const menuBtn = document.getElementById('rr-menu-btn');
  const menuPanel = document.getElementById('rr-menu-panel');
  if (menuBtn && menuPanel) {
    menuBtn.addEventListener('click', () => {
      const isHidden = menuPanel.hasAttribute('hidden');
      if (isHidden) {
        menuPanel.removeAttribute('hidden');
        menuPanel.style.display = 'block';
      } else {
        menuPanel.setAttribute('hidden', '');
        menuPanel.style.display = 'none';
      }
    });
  }

  // set copyright year
  const yearEl = document.querySelector('#rr-footer #copyright-year') || document.getElementById('copyright-year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

});
