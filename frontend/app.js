(function(){
  'use strict';

  const apiBase = (window.CONFIG && window.CONFIG.API_BASE) || '/api';

  async function fetchUsers() {
    try {
      const res = await fetch(`${apiBase}/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      renderUsers(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  function renderUsers(users){
    const el = document.getElementById('users-list');
    const stat = document.getElementById('stat-users');
    if(!el) return;
    stat && (stat.textContent = String(users.length || 0));
    if(users.length === 0){
      el.innerHTML = '<p style="color:var(--text-3);text-align:center;padding:48px 20px;font-weight:300;">No registered users yet.</p>';
      return;
    }
    const rows = users.map(u => `<div style="padding:12px;border-bottom:1px solid rgba(255,255,255,0.03);"><strong style="color:var(--accent);">${escapeHtml(u.username)}</strong><div style="font-size:13px;color:var(--text-3);">${escapeHtml(u.email)} • ${new Date(u.created_at).toLocaleString()}</div></div>`);
    el.innerHTML = rows.join('');
  }

  function escapeHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  async function createUser(username,email){
    try{
      const res = await fetch(`${apiBase}/users`,{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,email})
      });
      if(!res.ok){ const err = await res.json(); throw new Error(err.error||'Create failed'); }
      return await res.json();
    }catch(e){ throw e; }
  }

  function showMsg(id, text, ok){
    const el = document.getElementById(id); if(!el) return; el.textContent = text; el.className = 'form-msg ' + (ok? 'ok':'err');
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    fetchUsers();

    const form = document.getElementById('register-form');
    if(form){
      form.addEventListener('submit', async (e)=>{
        e.preventDefault();
        const name = document.getElementById('reg-name').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const msgId = 'reg-msg';
        if(!name || !email){ showMsg(msgId,'Name and email are required',false); return; }
        try{
          const result = await createUser(name,email);
          showMsg(msgId,'Account created — welcome!',true);
          form.reset();
          fetchUsers();
        }catch(err){ showMsg(msgId,err.message||'Error creating account',false); }
      });
    }

    // Admin tab to refresh users
    document.querySelectorAll('.admin-tab').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        document.querySelectorAll('.admin-tab').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.querySelectorAll('.admin-panel').forEach(p=>p.classList.remove('active'));
        const panel = document.getElementById('panel-'+tab);
        if(panel){ panel.classList.add('active'); }
        if(tab === 'users'){ fetchUsers(); }
      });
    });
  });

})();
