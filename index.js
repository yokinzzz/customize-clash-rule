const yaml = require('js-yaml');
// test github action
// personal clash rule
const WHITE_LIST_RULES = [
  "RULE-SET,applications,DIRECT",
  "DOMAIN,firefly-ps.adobe.io,SINGAPORE",
  "DOMAIN,bing.com,AUTO",
  "RULE-SET,private,DIRECT",
  "RULE-SET,reject,REJECT",
  "RULE-SET,icloud,DIRECT",
  "RULE-SET,apple,DIRECT",
  "RULE-SET,google,AUTO",
  "RULE-SET,proxy,AUTO",
  "RULE-SET,direct,DIRECT",
  "RULE-SET,lancidr,DIRECT",
  "RULE-SET,cncidr,DIRECT",
  "RULE-SET,telegramcidr,AUTO",
  "GEOIP,LAN,DIRECT",
  "GEOIP,CN,DIRECT",
  "MATCH,AUTO"
];

const BLACK_LIST_RULES = [
  "RULE-SET,applications,DIRECT",
  "DOMAIN,firefly-ps.adobe.io,SINGAPORE",
  "DOMAIN,tpddns.cn,DIRECT",
  "DOMAIN-SUFFIX,googleapis.com,AUTO",
  "RULE-SET,private,DIRECT",
  "RULE-SET,reject,REJECT",
  "RULE-SET,tld-not-cn,AUTO",
  "RULE-SET,gfw,AUTO",
  "RULE-SET,greatfire,AUTO",
  "RULE-SET,telegramcidr,AUTO",
  "MATCH,DIRECT"
];

const RULE_PROVIDERS = {
  "reject": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/reject.txt", "path": "./ruleset/reject.yaml", "interval": 86400 },
  "icloud": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/icloud.txt", "path": "./ruleset/icloud.yaml", "interval": 86400 },
  "apple": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/apple.txt", "path": "./ruleset/apple.yaml", "interval": 86400 },
  "google": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/google.txt", "path": "./ruleset/google.yaml", "interval": 86400 },
  "proxy": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/proxy.txt", "path": "./ruleset/proxy.yaml", "interval": 86400 },
  "direct": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/direct.txt", "path": "./ruleset/direct.yaml", "interval": 86400 },
  "private": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/private.txt", "path": "./ruleset/private.yaml", "interval": 86400 },
  "gfw": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/gfw.txt", "path": "./ruleset/gfw.yaml", "interval": 86400 },
  "greatfire": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/greatfire.txt", "path": "./ruleset/greatfire.yaml", "interval": 86400 },
  "tld-not-cn": { "type": "http", "behavior": "domain", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/tld-not-cn.txt", "path": "./ruleset/tld-not-cn.yaml", "interval": 86400 },
  "telegramcidr": { "type": "http", "behavior": "ipcidr", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/telegramcidr.txt", "path": "./ruleset/telegramcidr.yaml", "interval": 86400 },
  "cncidr": { "type": "http", "behavior": "ipcidr", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/cncidr.txt", "path": "./ruleset/cncidr.yaml", "interval": 86400 },
  "lancidr": { "type": "http", "behavior": "ipcidr", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/lancidr.txt", "path": "./ruleset/lancidr.yaml", "interval": 86400 },
  "applications": { "type": "http", "behavior": "classical", "url": "https://cdn.jsdelivr.net/gh/Loyalsoldier/clash-rules@release/applications.txt", "path": "./ruleset/applications.yaml", "interval": 86400 }
};

const GROUP_TEMPLATE_AUTO = {
  "name": "AUTO",
  "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png",
  "type": "url-test",
  "interval": 300,
  "url": "http://www.gstatic.com/generate_204"
};

// singapore for adobe usage
const GROUP_TEMPLATE_SINGAPORE = {
  "name": "SINGAPORE",
  "icon": "https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Singapore.png",
  "type": "url-test",
  "interval": 300,
  "url": "http://www.gstatic.com/generate_204"
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    // check url path
    let targetRules;
    if (url.pathname.endsWith('whitelist')) {
      targetRules = WHITE_LIST_RULES;
    } else if (url.pathname.endsWith('blacklist')) {
      targetRules = BLACK_LIST_RULES;
    } else {
      return new Response("unknown path", { status: 404 });
    }
    // Cloudflare cache
    const cache = caches.default;
    let response = await cache.match(request);
    if (response) {
      return response;
    }
    try {
      // network_url is the original clash config url
      const upstreamResponse = await fetch(env.network_url, {
        method: 'GET',
        headers: { 'User-Agent': 'Clash-Worker/1.0' } // 最好加上 UA
      });
      if (!upstreamResponse.ok) {
        return new Response("Failed to fetch original clash config", { status: 502 });
      }
      const upstreamText = await upstreamResponse.text();
      const config = yaml.load(upstreamText);
      // build customized proxy group
      const allProxies = [];
      const singaporeProxies = [];
      if (Array.isArray(config['proxies'])) {
        for (const proxy of config['proxies']) {
          const name = proxy.name;
          allProxies.push(name);
          // extract singapore server
          if (name.includes("新加坡") || name.includes("Singapore")) {
            singaporeProxies.push(name);
          }
        }
      }
      const autoGroup = { ...GROUP_TEMPLATE_AUTO, proxies: allProxies };
      const singaporeGroup = { ...GROUP_TEMPLATE_SINGAPORE, proxies: singaporeProxies };
      // build final clash config
      config['rule-providers'] = RULE_PROVIDERS;
      config['proxy-groups'] = [autoGroup, singaporeGroup];
      config['rules'] = targetRules;
      const yamlString = yaml.dump(config, {
        lineWidth: -1,
        noRefs: true
      });
      // generate response
      response = new Response(yamlString, {
        headers: {
          'content-type': 'application/x-yaml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600' 
        },
      });

      // write Cloudflare Cache
      ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch (err) {
      return new Response(`Error processing config: ${err.message}`, { status: 500 });
    }
  }
};