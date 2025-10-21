/**
 * LocalStorage管理モジュール
 * データの保存、読み込み、削除を管理
 */

const Storage = {
    // LocalStorageのキー
    KEYS: {
        API_KEY: 'apiKey',
        SELECTED_MODEL: 'selectedModel',
        FAVORITE_MODELS: 'favoriteModels',
        CUSTOM_MODELS: 'customModels',
        HISTORY_CURRENT: 'history_log_current',
        FAVORITES: 'favorites',
        SETTINGS: 'settings'
    },

    // 履歴ログの最大件数
    HISTORY_MAX_PER_FILE: 50,

    /**
     * LocalStorageにデータを保存
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    /**
     * LocalStorageからデータを取得
     */
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },

    /**
     * LocalStorageからデータを削除
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    /**
     * LocalStorageの容量をチェック
     */
    checkQuota() {
        try {
            const total = new Blob(Object.values(localStorage)).size;
            const limit = 5 * 1024 * 1024; // 5MB（目安）
            return {
                used: total,
                limit: limit,
                percentage: (total / limit) * 100
            };
        } catch (e) {
            console.error('Storage quota check error:', e);
            return null;
        }
    },

    // ========================================
    // APIキー管理
    // ========================================

    /**
     * APIキーを保存
     */
    saveApiKey(apiKey) {
        return this.set(this.KEYS.API_KEY, apiKey);
    },

    /**
     * APIキーを取得
     */
    getApiKey() {
        return this.get(this.KEYS.API_KEY, '');
    },

    /**
     * APIキーを削除
     */
    removeApiKey() {
        return this.remove(this.KEYS.API_KEY);
    },

    // ========================================
    // モデル管理
    // ========================================

    /**
     * 選択中のモデルを保存
     */
    saveSelectedModel(modelId) {
        return this.set(this.KEYS.SELECTED_MODEL, modelId);
    },

    /**
     * 選択中のモデルを取得
     */
    getSelectedModel() {
        return this.get(this.KEYS.SELECTED_MODEL, 'gemini-2.0-flash-exp');
    },

    /**
     * お気に入りモデルを保存
     */
    saveFavoriteModels(models) {
        return this.set(this.KEYS.FAVORITE_MODELS, models);
    },

    /**
     * お気に入りモデルを取得
     */
    getFavoriteModels() {
        return this.get(this.KEYS.FAVORITE_MODELS, []);
    },

    /**
     * お気に入りモデルに追加
     */
    addFavoriteModel(modelId) {
        const favorites = this.getFavoriteModels();
        if (!favorites.includes(modelId)) {
            favorites.push(modelId);
            return this.saveFavoriteModels(favorites);
        }
        return true;
    },

    /**
     * お気に入りモデルから削除
     */
    removeFavoriteModel(modelId) {
        const favorites = this.getFavoriteModels();
        const filtered = favorites.filter(id => id !== modelId);
        return this.saveFavoriteModels(filtered);
    },

    /**
     * カスタムモデルを保存
     */
    saveCustomModels(models) {
        return this.set(this.KEYS.CUSTOM_MODELS, models);
    },

    /**
     * カスタムモデルを取得
     */
    getCustomModels() {
        return this.get(this.KEYS.CUSTOM_MODELS, []);
    },

    /**
     * カスタムモデルを追加
     */
    addCustomModel(modelId) {
        const customs = this.getCustomModels();
        if (!customs.includes(modelId)) {
            customs.push(modelId);
            return this.saveCustomModels(customs);
        }
        return true;
    },

    /**
     * カスタムモデルを削除
     */
    removeCustomModel(modelId) {
        const customs = this.getCustomModels();
        const filtered = customs.filter(id => id !== modelId);
        return this.saveCustomModels(filtered);
    },

    // ========================================
    // 履歴管理
    // ========================================

    /**
     * 履歴を追加
     */
    addHistory(historyItem) {
        const history = this.getHistory();

        // IDとタイムスタンプを追加
        historyItem.id = this.generateId();
        historyItem.timestamp = new Date().toISOString();

        history.unshift(historyItem); // 最新を先頭に追加

        // 50件を超えたら古いログをアーカイブ
        if (history.length > this.HISTORY_MAX_PER_FILE) {
            this.archiveHistory(history);
        } else {
            this.set(this.KEYS.HISTORY_CURRENT, history);
        }

        return historyItem;
    },

    /**
     * 現在の履歴を取得
     */
    getHistory() {
        return this.get(this.KEYS.HISTORY_CURRENT, []);
    },

    /**
     * 全履歴を取得（アーカイブ含む）
     */
    getAllHistory() {
        const current = this.getHistory();
        const archives = this.getArchivedHistory();
        return [...current, ...archives];
    },

    /**
     * 履歴をIDで取得
     */
    getHistoryById(id) {
        const allHistory = this.getAllHistory();
        return allHistory.find(item => item.id === id);
    },

    /**
     * 履歴を削除
     */
    removeHistory(id) {
        // 現在の履歴から削除
        let history = this.getHistory();
        history = history.filter(item => item.id !== id);
        this.set(this.KEYS.HISTORY_CURRENT, history);

        // アーカイブからも削除
        let archiveIndex = 1;
        while (true) {
            const key = `history_log_${archiveIndex}`;
            const archive = this.get(key, null);
            if (!archive) break;

            const filtered = archive.filter(item => item.id !== id);
            if (filtered.length !== archive.length) {
                this.set(key, filtered);
            }
            archiveIndex++;
        }

        return true;
    },

    /**
     * 全履歴を削除
     */
    clearAllHistory() {
        // 現在の履歴を削除
        this.remove(this.KEYS.HISTORY_CURRENT);

        // アーカイブを全削除
        let archiveIndex = 1;
        while (true) {
            const key = `history_log_${archiveIndex}`;
            if (!this.get(key, null)) break;
            this.remove(key);
            archiveIndex++;
        }

        return true;
    },

    /**
     * 履歴をアーカイブ
     */
    archiveHistory(history) {
        const toArchive = history.slice(this.HISTORY_MAX_PER_FILE);
        const current = history.slice(0, this.HISTORY_MAX_PER_FILE);

        // 現在の履歴を更新
        this.set(this.KEYS.HISTORY_CURRENT, current);

        // 既存のアーカイブをシフト
        let archiveIndex = 1;
        while (this.get(`history_log_${archiveIndex}`, null)) {
            archiveIndex++;
        }

        // 新しいアーカイブを保存
        this.set(`history_log_${archiveIndex}`, toArchive);
    },

    /**
     * アーカイブされた履歴を取得
     */
    getArchivedHistory() {
        const archived = [];
        let archiveIndex = 1;

        while (true) {
            const key = `history_log_${archiveIndex}`;
            const archive = this.get(key, null);
            if (!archive) break;
            archived.push(...archive);
            archiveIndex++;
        }

        return archived;
    },

    /**
     * 最近のN件の履歴を取得
     */
    getRecentHistory(count = 5) {
        const history = this.getHistory();
        return history.slice(0, count);
    },

    // ========================================
    // お気に入り管理
    // ========================================

    /**
     * お気に入りを追加
     */
    addFavorite(favoriteItem) {
        const favorites = this.getFavorites();

        favoriteItem.id = this.generateId();
        favoriteItem.savedAt = new Date().toISOString();

        favorites.unshift(favoriteItem);

        return this.set(this.KEYS.FAVORITES, favorites);
    },

    /**
     * お気に入り一覧を取得
     */
    getFavorites() {
        return this.get(this.KEYS.FAVORITES, []);
    },

    /**
     * お気に入りをIDで取得
     */
    getFavoriteById(id) {
        const favorites = this.getFavorites();
        return favorites.find(item => item.id === id);
    },

    /**
     * お気に入りを削除
     */
    removeFavorite(id) {
        let favorites = this.getFavorites();
        favorites = favorites.filter(item => item.id !== id);
        return this.set(this.KEYS.FAVORITES, favorites);
    },

    /**
     * お気に入りを更新（メモ追加など）
     */
    updateFavorite(id, updates) {
        const favorites = this.getFavorites();
        const index = favorites.findIndex(item => item.id === id);

        if (index !== -1) {
            favorites[index] = { ...favorites[index], ...updates };
            return this.set(this.KEYS.FAVORITES, favorites);
        }

        return false;
    },

    /**
     * 全お気に入りを削除
     */
    clearFavorites() {
        return this.remove(this.KEYS.FAVORITES);
    },

    // ========================================
    // エクスポート/インポート
    // ========================================

    /**
     * 履歴をエクスポート
     */
    exportHistory() {
        const history = this.getAllHistory();
        return JSON.stringify(history, null, 2);
    },

    /**
     * お気に入りをエクスポート
     */
    exportFavorites() {
        const favorites = this.getFavorites();
        return JSON.stringify(favorites, null, 2);
    },

    /**
     * お気に入りをインポート
     */
    importFavorites(jsonString) {
        try {
            const favorites = JSON.parse(jsonString);
            if (Array.isArray(favorites)) {
                return this.set(this.KEYS.FAVORITES, favorites);
            }
            return false;
        } catch (e) {
            console.error('Import favorites error:', e);
            return false;
        }
    },

    /**
     * 設定を保存
     */
    saveSettings(settings) {
        return this.set(this.KEYS.SETTINGS, settings);
    },

    /**
     * 設定を取得
     */
    getSettings() {
        return this.get(this.KEYS.SETTINGS, {});
    },

    // ========================================
    // ユーティリティ
    // ========================================

    /**
     * ユニークIDを生成
     */
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * データをダウンロード
     */
    downloadAsFile(data, filename) {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

// グローバルに公開
window.Storage = Storage;
