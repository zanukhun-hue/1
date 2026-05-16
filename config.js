// Настройки сайта.
// Для публичной статистики создайте код в GoatCounter и вставьте его ниже.
// Для общей публикации видео подключите Supabase и заполните supabaseUrl + supabaseAnonKey.
window.AE_SITE_CONFIG = {
  goatCounterCode: "",
  telegramUrl: "https://t.me/ae_plugins_vault",

  // Supabase Project URL. Пример: "https://abcd1234.supabase.co"
  supabaseUrl: "",

  // Supabase anon/public key. Service role key сюда вставлять нельзя.
  supabaseAnonKey: ""
};

(function(){
  function loadCommunitySupabaseBridge(){
    if(document.querySelector('script[data-community-supabase-bridge]')) return;
    var script = document.createElement('script');
    script.src = 'community-supabase.js?v=1';
    script.async = true;
    script.dataset.communitySupabaseBridge = '1';
    document.body.appendChild(script);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      setTimeout(loadCommunitySupabaseBridge, 0);
    });
  } else {
    setTimeout(loadCommunitySupabaseBridge, 0);
  }
})();
