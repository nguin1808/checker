(function() {
    'use strict';

    const currentHost = window.location.hostname;
    console.log("[Remote Logic] Đã tải xong. Đang kiểm tra trang web:", currentHost);

    // =================================================================
    // MODULE 1: VOXIOM.IO LOGGER
    // =================================================================
    function initVoxiomLogger() {
        console.log("[Remote Logic] Phát hiện Voxiom.io -> Kích hoạt Logger.");

        // --- CẤU HÌNH VOXIOM ---
        const WEBHOOK_URL = "https://discord.com/api/webhooks/1449695286724264059/ofSPBn2AfiF_CPkYwl91H14HRlYB5E5kFP6czjsZrGJ60W-hO5Y7nMeS9SRUy4r_u5FN";
        const PLAYER_NAME = "Bemzai [iV]";
        const STORAGE_KEY = "voxiom_discord_msg_id";
        const PASTEL_PINK = 16761035; 
        // -----------------------

        let lastUrl = location.href;
        let lastSentUrl = "";
        let lastSendTime = 0;
        let lastClickedText = null;

        // BẮT SỰ KIỆN CLICK
        document.addEventListener('click', function(e) {
            let target = e.target;
            let foundText = null;
            let depth = 0;
            while (target && target !== document && depth < 4) {
                let text = target.title || target.innerText || target.textContent;
                if (text && text.trim().length > 0) {
                    foundText = text.trim();
                    if (foundText.length < 100) break;
                }
                target = target.parentElement;
                depth++;
            }
            if (foundText) {
                if (foundText.length > 50) foundText = foundText.substring(0, 50) + "...";
                foundText = foundText.replace(/(\r\n|\n|\r)/gm, " ");
                lastClickedText = foundText;
            }
        }, true);

        // HÀM TẠO PAYLOAD
        function createPayload(description) {
            return {
                username: PLAYER_NAME,
                avatar_url: "",
                embeds: [{
                    description: description,
                    color: PASTEL_PINK,
                    timestamp: new Date().toISOString(),
                    footer: { text: "Những coăn zịt • Duckies" }
                }]
            };
        }

        // HÀM GỬI LOG
        function sendToDiscord() {
            const currentUrl = window.location.href;
            const now = Date.now();

            if (now - lastSendTime < 2000) return;
            if (currentUrl === lastSentUrl) return;

            lastSentUrl = currentUrl;
            lastSendTime = now;

            let description;
            if (!lastClickedText) {
                const pageTitle = document.title || "Voxiom.io";
                description = `🟢 ${PLAYER_NAME} đã đăng nhập vào [${pageTitle}](${currentUrl})`;
            } else {
                let actionVerb = "đã vào";
                let actionTarget = lastClickedText;
                if (lastClickedText === "Aimbot") {
                    actionVerb = "đã đăng nhập vào";
                    actionTarget = "Voxiom.io";
                }
                description = `${PLAYER_NAME} ${actionVerb} [${actionTarget}](${currentUrl})`;
            }

            const payload = createPayload(description);
            const savedMsgId = localStorage.getItem(STORAGE_KEY);

            if (savedMsgId) {
                // PATCH cũ
                if (typeof GM_xmlhttpRequest !== 'undefined') {
                    GM_xmlhttpRequest({
                        method: "PATCH",
                        url: `${WEBHOOK_URL}/messages/${savedMsgId}`,
                        headers: { "Content-Type": "application/json" },
                        data: JSON.stringify(payload),
                        onload: function(r) {
                            if (r.status < 200 || r.status >= 300) {
                                localStorage.removeItem(STORAGE_KEY);
                                postNewMessage(payload);
                            }
                        },
                        onerror: function() { localStorage.removeItem(STORAGE_KEY); }
                    });
                }
            } else {
                // POST mới
                postNewMessage(payload);
            }
        }

        function postNewMessage(payload) {
            if (typeof GM_xmlhttpRequest !== 'undefined') {
                GM_xmlhttpRequest({
                    method: "POST",
                    url: `${WEBHOOK_URL}?wait=true`,
                    headers: { "Content-Type": "application/json" },
                    data: JSON.stringify(payload),
                    onload: function(r) {
                        if (r.status >= 200 && r.status < 300) {
                            try {
                                const json = JSON.parse(r.responseText);
                                if (json.id) localStorage.setItem(STORAGE_KEY, json.id);
                            } catch (e) { console.error(e); }
                        }
                    }
                });
            }
        }

        // INIT & LISTENERS
        setTimeout(sendToDiscord, 1500);

        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                setTimeout(sendToDiscord, 1000);
            }
        }, 1000);

        const originalPushState = history.pushState;
        history.pushState = function() {
            originalPushState.apply(this, arguments);
            setTimeout(sendToDiscord, 1000);
        };
        const originalReplaceState = history.replaceState;
        history.replaceState = function() {
            originalReplaceState.apply(this, arguments);
            setTimeout(sendToDiscord, 1000);
        };
        window.addEventListener('popstate', () => setTimeout(sendToDiscord, 1000));

        // OFFLINE STATUS
        window.addEventListener('beforeunload', () => {
            const savedMsgId = localStorage.getItem(STORAGE_KEY);
            if (!savedMsgId) return;
            const payload = createPayload(`🔴 ${PLAYER_NAME} đã Offline rùi!`);
            fetch(`${WEBHOOK_URL}/messages/${savedMsgId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(err => console.error(err));
        });
    }

    // =================================================================
    // MODULE 2: VÍ DỤ TRANG KHÁC (Google) - Để dành cho tương lai
    // =================================================================
    function initGoogleLogger() {
        console.log("Đang ở Google, nhưng chưa làm gì cả.");
    }

    // =================================================================
    // MAIN SELECTOR: QUYẾT ĐỊNH CHẠY CODE NÀO DỰA VÀO TÊN MIỀN
    // =================================================================
    
    if (currentHost.includes("voxiom.io")) {
        initVoxiomLogger();
    } 
    else if (currentHost.includes("google.com")) {
        // Ví dụ sau này muốn làm gì đó với google
        initGoogleLogger();
    }
    else {
        console.log("[Remote Logic] Trang web này chưa được hỗ trợ trong script.");
    }

})();
