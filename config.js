// Настройки сайта.
// Для публичной статистики создайте код в GoatCounter и вставьте его ниже.
// Для общей публикации видео подключен Supabase.
window.AE_SITE_CONFIG = {
  goatCounterCode: "",
  telegramUrl: "https://t.me/ae_plugins_vault",

  // Supabase Project URL.
  supabaseUrl: "https://qfugshwpslhdgrogrcyl.supabase.co",

  // Supabase anon/public key. Service role key сюда вставлять нельзя.
  supabaseAnonKey: "sb_publishable_EKsmv1T88vEI8fCoZJgxRw_T8H1CzE6"
};

(function(){
  function loadCommunitySupabaseBridge(){
    if(document.querySelector('script[data-community-supabase-bridge]')) return;
    var script = document.createElement('script');
    script.src = 'community-supabase.js?v=2';
    script.dataset.communitySupabaseBridge = '1';
    document.body.appendChild(script);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', loadCommunitySupabaseBridge);
  } else {
    loadCommunitySupabaseBridge();
  }
})();
