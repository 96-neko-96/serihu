/**
 * メインJavaScript
 * UIの制御とイベント処理
 */

// アプリケーション状態
const AppState = {
    currentConfig: null,
    currentResult: null,
    currentHistoryId: null
};

// ===================================
// 初期化
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // テーマの初期化
    initializeTheme();

    // 設定の読み込み
    loadSettings();

    // イベントリスナーの設定
    setupEventListeners();

    // 履歴とお気に入りの表示
    renderHistory();
    renderFavorites();

    // モデルリストの表示
    renderModelList();
}

// ===================================
// イベントリスナーの設定
// ===================================

function setupEventListeners() {
    // 用途選択
    document.getElementById('purpose').addEventListener('change', handlePurposeChange);

    // セリフの長さタブ
    document.querySelectorAll('.length-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleTabSwitch(e, 'length'));
    });

    // 入力方式タブ
    document.querySelectorAll('.input-mode-tabs .tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => handleTabSwitch(e, 'input'));
    });

    // 出力フォーマット
    document.getElementById('outputFormat').addEventListener('change', handleFormatChange);

    // 生成ボタン
    document.getElementById('generateBtn').addEventListener('click', handleGenerate);

    // 再生成ボタン
    document.getElementById('regenerateBtn').addEventListener('click', handleRegenerate);

    // コピーボタン
    document.getElementById('copyBtn').addEventListener('click', handleCopy);

    // お気に入りボタン
    document.getElementById('favoriteBtn').addEventListener('click', handleAddFavorite);

    // サイドバートグル
    document.getElementById('sidebarToggle').addEventListener('click', handleSidebarToggle);

    // サイドバータブ
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', handleSidebarTabSwitch);
    });

    // テーマ切り替えボタン
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);

    // 設定ボタン
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);

    // 設定モーダル外クリック
    document.getElementById('settingsModal').addEventListener('click', (e) => {
        if (e.target.id === 'settingsModal') {
            closeSettings();
        }
    });

    // APIキー表示/非表示
    document.getElementById('toggleApiKeyBtn').addEventListener('click', toggleApiKeyVisibility);

    // APIキー保存
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);

    // モデル追加
    document.getElementById('addModelBtn').addEventListener('click', addCustomModel);

    // モデル選択
    document.getElementById('selectedModel').addEventListener('change', handleModelChange);

    // お気に入りモデル表示切替
    document.getElementById('showFavoritesOnly').addEventListener('change', renderModelList);

    // エクスポート/インポート
    document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
    document.getElementById('exportFavoritesBtn').addEventListener('click', exportFavorites);
    document.getElementById('importFavoritesBtn').addEventListener('click', importFavorites);

    // ランダムシチュエーション生成
    document.getElementById('randomSituationBtn').addEventListener('click', handleRandomSituation);
}

// ===================================
// 設定の読み込み
// ===================================

function loadSettings() {
    // APIキーの読み込み
    const apiKey = Storage.getApiKey();
    if (apiKey) {
        document.getElementById('apiKey').value = apiKey;
    }

    // モデルの読み込み
    const selectedModel = Storage.getSelectedModel();
    document.getElementById('selectedModel').value = selectedModel;
}

// ===================================
// タブ切替
// ===================================

function handleTabSwitch(e, type) {
    const btn = e.target;
    const tab = btn.dataset.tab;

    // ボタンのアクティブ状態を切り替え
    const parentTabs = btn.parentElement;
    parentTabs.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // コンテンツの表示切り替え
    if (type === 'length') {
        document.querySelectorAll('[id^="length"]').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`length${capitalize(tab)}`).classList.add('active');
    } else if (type === 'input') {
        document.querySelectorAll('[id$="Input"]').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}Input`).classList.add('active');
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ===================================
// 用途選択の処理
// ===================================

function handlePurposeChange(e) {
    const otherGroup = document.getElementById('otherPurposeGroup');
    if (e.target.value === 'other') {
        otherGroup.style.display = 'block';
    } else {
        otherGroup.style.display = 'none';
    }
}

// ===================================
// 出力フォーマット変更
// ===================================

function handleFormatChange(e) {
    const customHelp = document.getElementById('customFormatHelp');
    if (e.target.value === 'custom') {
        customHelp.style.display = 'block';
    } else {
        customHelp.style.display = 'none';
    }

    // 現在の結果がある場合は再フォーマット
    if (AppState.currentResult) {
        displayResult(AppState.currentResult, e.target.value);
    }
}

// ===================================
// セリフ生成
// ===================================

async function handleGenerate() {
    try {
        // 設定を収集
        const config = collectConfig();

        // バリデーション
        if (!validateConfig(config)) {
            return;
        }

        // ローディング表示
        showLoading();

        // API呼び出し
        const result = await GeminiAPI.generateDialogue(config);

        // ローディング非表示
        hideLoading();

        // 結果を表示
        displayResult(result.text, document.getElementById('outputFormat').value);

        // 状態を保存
        AppState.currentConfig = config;
        AppState.currentResult = result.text;

        // 履歴に追加
        const historyItem = {
            config: config,
            result: result.text,
            model: result.model,
            format: document.getElementById('outputFormat').value
        };
        const saved = Storage.addHistory(historyItem);
        AppState.currentHistoryId = saved.id;

        // 履歴を再描画
        renderHistory();

        // アクションボタンを表示
        document.getElementById('outputActions').style.display = 'flex';

    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// ===================================
// 再生成
// ===================================

async function handleRegenerate() {
    if (!AppState.currentConfig) {
        showError('再生成する内容がありません。');
        return;
    }

    try {
        showLoading();

        const result = await GeminiAPI.generateDialogue(AppState.currentConfig);

        hideLoading();

        displayResult(result.text, document.getElementById('outputFormat').value);

        AppState.currentResult = result.text;

        // 履歴に追加
        const historyItem = {
            config: AppState.currentConfig,
            result: result.text,
            model: result.model,
            format: document.getElementById('outputFormat').value
        };
        const saved = Storage.addHistory(historyItem);
        AppState.currentHistoryId = saved.id;

        renderHistory();

    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

// ===================================
// 設定収集
// ===================================

function collectConfig() {
    const config = {
        purpose: document.getElementById('purpose').value,
        otherPurpose: document.getElementById('otherPurpose').value,
        avoidSimilar: document.getElementById('avoidSimilar').checked
    };

    // セリフの長さ
    const activeLengthTab = document.querySelector('.length-tabs .tab-btn.active').dataset.tab;
    config.lengthType = activeLengthTab;

    if (activeLengthTab === 'count') {
        config.lengthValue = parseInt(document.getElementById('lineCount').value);
    } else if (activeLengthTab === 'time') {
        config.lengthValue = parseInt(document.getElementById('timeValue').value);
        config.lengthUnit = document.getElementById('timeUnit').value;
    } else if (activeLengthTab === 'stage') {
        config.stage = document.getElementById('stageSelect').value;
    }

    // 入力方式
    const activeInputTab = document.querySelector('.input-mode-tabs .tab-btn.active').dataset.tab;
    config.inputType = activeInputTab;

    if (activeInputTab === 'simple') {
        config.simpleText = document.getElementById('simpleText').value;
    } else {
        // 詳細入力
        config.location = document.getElementById('location').value;
        config.timeOfDay = document.getElementById('timeOfDay').value;
        config.situation = document.getElementById('situation').value;

        config.character = {
            name: document.getElementById('charName').value,
            gender: document.getElementById('charGender').value,
            age: document.getElementById('charAge').value,
            personality: document.getElementById('charPersonality').value,
            tone: document.getElementById('charTone').value,
            voice: document.getElementById('charVoice').value,
            role: document.getElementById('charRole').value
        };
    }

    return config;
}

// ===================================
// 設定のバリデーション
// ===================================

function validateConfig(config) {
    // 簡単入力の場合
    if (config.inputType === 'simple') {
        if (!config.simpleText || config.simpleText.trim() === '') {
            showError('シチュエーションの内容を入力してください。');
            return false;
        }
    }

    // APIキーチェック
    if (!Storage.getApiKey()) {
        showError('APIキーが設定されていません。設定画面からAPIキーを登録してください。');
        openSettings();
        return false;
    }

    return true;
}

// ===================================
// 結果の表示
// ===================================

function displayResult(text, format) {
    const outputArea = document.getElementById('outputArea');

    let formattedText = text;

    // フォーマット適用
    if (format === 'text') {
        formattedText = text;
    } else if (format === 'simple') {
        // シンプル台本形式
        formattedText = formatAsSimpleScript(text);
    } else if (format === 'detailed') {
        // 詳細台本形式
        formattedText = formatAsDetailedScript(text);
    } else if (format === 'custom') {
        // カスタムフォーマット
        const template = document.getElementById('customTemplate').value;
        if (template) {
            formattedText = applyCustomFormat(text, template);
        }
    }

    // テキストエリアに表示
    outputArea.value = formattedText;
}

// ===================================
// フォーマット処理
// ===================================

function formatAsSimpleScript(text) {
    // 簡易的な台本形式への変換
    // キャラクター名がある場合はそのまま、ない場合は行頭に追加
    const lines = text.split('\n');
    return lines.map(line => {
        if (line.trim() === '') return '';
        // すでに「キャラ名:」の形式なら維持
        if (line.match(/^[^:]+:/)) {
            return line;
        }
        // そうでない場合はシンプルに返す
        return line;
    }).join('\n');
}

function formatAsDetailedScript(text) {
    // 詳細台本形式への変換
    // （）内をト書きとして扱う
    return text;
}

function applyCustomFormat(text, template) {
    // カスタムフォーマットの適用
    // 簡易実装：テンプレートの{line}を各行で置き換え
    const lines = text.split('\n').filter(l => l.trim() !== '');
    const config = AppState.currentConfig;

    return lines.map((line, index) => {
        let formatted = template;
        formatted = formatted.replace(/{line}/g, line);
        formatted = formatted.replace(/{scene}/g, index + 1);

        if (config && config.inputType === 'detailed' && config.character.name) {
            formatted = formatted.replace(/{character}/g, config.character.name);
        } else {
            formatted = formatted.replace(/{character}/g, 'キャラクター');
        }

        // ト書き（簡易実装）
        const directionMatch = line.match(/\(([^)]+)\)/);
        if (directionMatch) {
            formatted = formatted.replace(/{direction}/g, directionMatch[1]);
        } else {
            formatted = formatted.replace(/{direction}/g, '');
        }

        return formatted;
    }).join('\n');
}

// ===================================
// コピー機能
// ===================================

function handleCopy() {
    const outputArea = document.getElementById('outputArea');
    const text = outputArea.value;

    navigator.clipboard.writeText(text).then(() => {
        showSuccess('クリップボードにコピーしました！');
    }).catch(err => {
        console.error('Copy failed:', err);
        showError('コピーに失敗しました。');
    });
}

// ===================================
// お気に入り追加
// ===================================

function handleAddFavorite() {
    const outputArea = document.getElementById('outputArea');
    const currentContent = outputArea.value;

    if (!currentContent || currentContent.trim() === '') {
        showError('お気に入りに追加する内容がありません。');
        return;
    }

    const favoriteItem = {
        historyId: AppState.currentHistoryId,
        content: currentContent, // テキストエリアの現在の値を使用（編集後の内容）
        config: AppState.currentConfig,
        memo: '',
        tags: []
    };

    Storage.addFavorite(favoriteItem);
    renderFavorites();

    showSuccess('お気に入りに追加しました！');
}

// ===================================
// サイドバー
// ===================================

function handleSidebarToggle() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function handleSidebarTabSwitch(e) {
    const tab = e.target;
    const targetTab = tab.dataset.tab;

    // タブのアクティブ状態を切り替え
    document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');

    // コンテンツの表示切り替え
    document.querySelectorAll('.sidebar-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${targetTab}Tab`).classList.add('active');
}

// ===================================
// 履歴の表示
// ===================================

function renderHistory() {
    const historyList = document.getElementById('historyList');
    const history = Storage.getHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<div class="empty-state-small">履歴がありません</div>';
        return;
    }

    historyList.innerHTML = '';

    history.forEach(item => {
        const historyItem = createHistoryItem(item);
        historyList.appendChild(historyItem);
    });
}

function createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item';

    const header = document.createElement('div');
    header.className = 'history-item-header';

    const time = document.createElement('div');
    time.className = 'history-item-time';
    time.textContent = formatDateTime(item.timestamp);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-small';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = '削除';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteHistory(item.id);
    };

    actions.appendChild(deleteBtn);
    header.appendChild(time);
    header.appendChild(actions);

    const content = document.createElement('div');
    content.className = 'history-item-content';
    content.textContent = item.result;

    div.appendChild(header);
    div.appendChild(content);

    // クリックで読み込み
    div.onclick = () => loadHistory(item);

    return div;
}

function loadHistory(item) {
    // 設定を復元
    restoreConfig(item.config);

    // 結果を表示
    displayResult(item.result, item.format || 'text');

    // 出力フォーマットを設定
    document.getElementById('outputFormat').value = item.format || 'text';

    // 状態を保存
    AppState.currentConfig = item.config;
    AppState.currentResult = item.result;
    AppState.currentHistoryId = item.id;

    // アクションボタンを表示
    document.getElementById('outputActions').style.display = 'flex';

    showSuccess('履歴を読み込みました。');
}

function deleteHistory(id) {
    if (confirm('この履歴を削除しますか?')) {
        Storage.removeHistory(id);
        renderHistory();
        showSuccess('履歴を削除しました。');
    }
}

function restoreConfig(config) {
    // 用途
    document.getElementById('purpose').value = config.purpose;
    if (config.purpose === 'other') {
        document.getElementById('otherPurposeGroup').style.display = 'block';
        document.getElementById('otherPurpose').value = config.otherPurpose || '';
    }

    // セリフの長さ
    const lengthTabs = document.querySelectorAll('.length-tabs .tab-btn');
    lengthTabs.forEach(btn => {
        if (btn.dataset.tab === config.lengthType) {
            btn.click();
        }
    });

    if (config.lengthType === 'count') {
        document.getElementById('lineCount').value = config.lengthValue;
    } else if (config.lengthType === 'time') {
        document.getElementById('timeValue').value = config.lengthValue;
        document.getElementById('timeUnit').value = config.lengthUnit;
    } else if (config.lengthType === 'stage') {
        document.getElementById('stageSelect').value = config.stage;
    }

    // 入力方式
    const inputTabs = document.querySelectorAll('.input-mode-tabs .tab-btn');
    inputTabs.forEach(btn => {
        if (btn.dataset.tab === config.inputType) {
            btn.click();
        }
    });

    if (config.inputType === 'simple') {
        document.getElementById('simpleText').value = config.simpleText || '';
    } else {
        document.getElementById('location').value = config.location || '';
        document.getElementById('timeOfDay').value = config.timeOfDay || 'unspecified';
        document.getElementById('situation').value = config.situation || '';

        if (config.character) {
            document.getElementById('charName').value = config.character.name || '';
            document.getElementById('charGender').value = config.character.gender || 'female';
            document.getElementById('charAge').value = config.character.age || '';
            document.getElementById('charPersonality').value = config.character.personality || '';
            document.getElementById('charTone').value = config.character.tone || '';
            document.getElementById('charVoice').value = config.character.voice || '';
            document.getElementById('charRole').value = config.character.role || '';
        }
    }

    // オプション
    document.getElementById('avoidSimilar').checked = config.avoidSimilar || false;
}

// ===================================
// お気に入りの表示
// ===================================

function renderFavorites() {
    const favoritesList = document.getElementById('favoritesList');
    const favorites = Storage.getFavorites();

    if (favorites.length === 0) {
        favoritesList.innerHTML = '<div class="empty-state-small">お気に入りがありません</div>';
        return;
    }

    favoritesList.innerHTML = '';

    favorites.forEach(item => {
        const favoriteItem = createFavoriteItem(item);
        favoritesList.appendChild(favoriteItem);
    });
}

function createFavoriteItem(item) {
    const div = document.createElement('div');
    div.className = 'favorite-item';

    const header = document.createElement('div');
    header.className = 'favorite-item-header';

    const time = document.createElement('div');
    time.className = 'history-item-time';
    time.textContent = formatDateTime(item.savedAt);

    const actions = document.createElement('div');
    actions.className = 'item-actions';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-icon-small';
    deleteBtn.textContent = '🗑️';
    deleteBtn.title = '削除';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFavorite(item.id);
    };

    actions.appendChild(deleteBtn);
    header.appendChild(time);
    header.appendChild(actions);

    const content = document.createElement('div');
    content.className = 'favorite-item-content';
    content.textContent = item.content;

    div.appendChild(header);
    div.appendChild(content);

    // クリックで読み込み
    div.onclick = () => loadFavorite(item);

    return div;
}

function loadFavorite(item) {
    // 設定を復元
    restoreConfig(item.config);

    // 結果を表示
    displayResult(item.content, 'text');

    // 状態を保存
    AppState.currentConfig = item.config;
    AppState.currentResult = item.content;

    // アクションボタンを表示
    document.getElementById('outputActions').style.display = 'flex';

    showSuccess('お気に入りを読み込みました。');
}

function deleteFavorite(id) {
    if (confirm('このお気に入りを削除しますか?')) {
        Storage.removeFavorite(id);
        renderFavorites();
        showSuccess('お気に入りを削除しました。');
    }
}

// ===================================
// エクスポート/インポート
// ===================================

function exportHistory() {
    const json = Storage.exportHistory();
    const filename = `history_${new Date().toISOString().split('T')[0]}.json`;
    Storage.downloadAsFile(json, filename);
    showSuccess('履歴をエクスポートしました。');
}

function exportFavorites() {
    const json = Storage.exportFavorites();
    const filename = `favorites_${new Date().toISOString().split('T')[0]}.json`;
    Storage.downloadAsFile(json, filename);
    showSuccess('お気に入りをエクスポートしました。');
}

function importFavorites() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const success = Storage.importFavorites(event.target.result);
            if (success) {
                renderFavorites();
                showSuccess('お気に入りをインポートしました。');
            } else {
                showError('インポートに失敗しました。ファイル形式を確認してください。');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ===================================
// 設定モーダル
// ===================================

function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('active');

    // 現在の設定を読み込み
    const apiKey = Storage.getApiKey();
    document.getElementById('apiKey').value = apiKey;

    const selectedModel = Storage.getSelectedModel();
    document.getElementById('selectedModel').value = selectedModel;

    renderModelList();
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('active');
}

function toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const btn = document.getElementById('toggleApiKeyBtn');

    if (apiKeyInput.type === 'password') {
        apiKeyInput.type = 'text';
        btn.textContent = '🙈';
    } else {
        apiKeyInput.type = 'password';
        btn.textContent = '👁️';
    }
}

function saveApiKey() {
    const apiKey = document.getElementById('apiKey').value.trim();

    if (!apiKey) {
        showError('APIキーを入力してください。');
        return;
    }

    Storage.saveApiKey(apiKey);
    showSuccess('APIキーを保存しました。');
}

// ===================================
// モデル管理
// ===================================

function renderModelList() {
    const modelList = document.getElementById('modelList');
    const showFavoritesOnly = document.getElementById('showFavoritesOnly').checked;

    const presetModels = [
        'gemini-2.0-flash-exp',
        'gemini-1.5-pro',
        'gemini-1.5-flash'
    ];

    const customModels = Storage.getCustomModels();
    const favoriteModels = Storage.getFavoriteModels();

    const allModels = [...presetModels, ...customModels];

    modelList.innerHTML = '';

    allModels.forEach(modelId => {
        const isFavorite = favoriteModels.includes(modelId);
        const isCustom = customModels.includes(modelId);

        // お気に入りのみ表示がONで、お気に入りでない場合はスキップ
        if (showFavoritesOnly && !isFavorite) {
            return;
        }

        const item = createModelItem(modelId, isFavorite, isCustom);
        modelList.appendChild(item);
    });

    // モデル選択ドロップダウンも更新
    updateModelDropdown(allModels);
}

function createModelItem(modelId, isFavorite, isCustom) {
    const div = document.createElement('div');
    div.className = 'model-item';

    const name = document.createElement('span');
    name.className = 'model-name';
    name.textContent = modelId;

    const actions = document.createElement('div');
    actions.className = 'model-actions';

    const favoriteBtn = document.createElement('button');
    favoriteBtn.className = 'btn-icon-small';
    favoriteBtn.textContent = isFavorite ? '⭐' : '☆';
    favoriteBtn.title = 'お気に入り';
    favoriteBtn.onclick = () => toggleModelFavorite(modelId);

    actions.appendChild(favoriteBtn);

    if (isCustom) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon-small';
        deleteBtn.textContent = '🗑️';
        deleteBtn.title = '削除';
        deleteBtn.onclick = () => deleteCustomModel(modelId);
        actions.appendChild(deleteBtn);
    }

    div.appendChild(name);
    div.appendChild(actions);

    return div;
}

function updateModelDropdown(models) {
    const select = document.getElementById('selectedModel');
    const currentValue = select.value;

    select.innerHTML = '';

    models.forEach(modelId => {
        const option = document.createElement('option');
        option.value = modelId;
        option.textContent = modelId;
        select.appendChild(option);
    });

    // 現在の選択を維持
    if (models.includes(currentValue)) {
        select.value = currentValue;
    }
}

function toggleModelFavorite(modelId) {
    const favorites = Storage.getFavoriteModels();

    if (favorites.includes(modelId)) {
        Storage.removeFavoriteModel(modelId);
    } else {
        Storage.addFavoriteModel(modelId);
    }

    renderModelList();
}

function addCustomModel() {
    const modelId = document.getElementById('customModelId').value.trim();

    if (!modelId) {
        showError('モデルIDを入力してください。');
        return;
    }

    Storage.addCustomModel(modelId);
    document.getElementById('customModelId').value = '';

    renderModelList();
    showSuccess('カスタムモデルを追加しました。');
}

function deleteCustomModel(modelId) {
    if (confirm(`モデル「${modelId}」を削除しますか?`)) {
        Storage.removeCustomModel(modelId);
        renderModelList();
        showSuccess('カスタムモデルを削除しました。');
    }
}

function handleModelChange(e) {
    const modelId = e.target.value;
    Storage.saveSelectedModel(modelId);
}

// ===================================
// UI表示関連
// ===================================

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
    document.getElementById('generateBtn').disabled = true;
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
    document.getElementById('generateBtn').disabled = false;
}

function showError(message) {
    alert(`エラー: ${message}`);
}

function showSuccess(message) {
    // 簡易的な成功メッセージ（将来的にはトーストなどに変更可能）
    console.log(`Success: ${message}`);

    // 一時的にボタンのテキストを変更
    const copyBtn = document.getElementById('copyBtn');
    if (message.includes('コピー') && copyBtn) {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<span>✅ コピー完了!</span>';
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
        }, 2000);
    }
}

// ===================================
// テーマ切り替え
// ===================================

function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);

    // アイコンの更新
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
        themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
        themeToggleBtn.title = theme === 'dark' ? 'ライトモードに切り替え' : 'ダークモードに切り替え';
    }
}

// ===================================
// ユーティリティ
// ===================================

function formatDateTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;

    // 1分以内
    if (diff < 60000) {
        return 'たった今';
    }
    // 1時間以内
    if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分前`;
    }
    // 24時間以内
    if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}時間前`;
    }
    // それ以上
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');

    return `${month}/${day} ${hours}:${minutes}`;
}

// ===================================
// ランダムシチュエーション生成
// ===================================

async function handleRandomSituation() {
    try {
        // APIキーチェック
        if (!Storage.getApiKey()) {
            showError('APIキーが設定されていません。設定画面からAPIキーを登録してください。');
            openSettings();
            return;
        }

        // ローディング表示
        showLoading();

        // ボタンを無効化
        const btn = document.getElementById('randomSituationBtn');
        btn.disabled = true;

        // API呼び出し
        const situation = await GeminiAPI.generateRandomSituation();

        // ローディング非表示
        hideLoading();

        // ボタンを有効化
        btn.disabled = false;

        // テキストエリアに挿入
        document.getElementById('simpleText').value = situation;

        showSuccess('ランダムシチュエーションを生成しました！');

    } catch (error) {
        hideLoading();

        // ボタンを有効化
        const btn = document.getElementById('randomSituationBtn');
        btn.disabled = false;

        showError(error.message);
    }
}
