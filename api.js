/**
 * Gemini API連携モジュール
 * APIへのリクエストとレスポンス処理を管理
 */

const GeminiAPI = {
    // APIエンドポイント
    BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',

    /**
     * セリフを生成
     * @param {Object} config - 生成設定
     * @returns {Promise<Object>} - 生成結果
     */
    async generateDialogue(config) {
        const apiKey = Storage.getApiKey();

        if (!apiKey) {
            throw new Error('APIキーが設定されていません。設定画面からAPIキーを登録してください。');
        }

        const model = Storage.getSelectedModel();
        const prompt = this.buildPrompt(config);

        const url = `${this.BASE_URL}/${model}:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: prompt
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.9,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(this.parseError(response.status, errorData));
            }

            const data = await response.json();

            // レスポンスからテキストを抽出
            if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
                return {
                    success: true,
                    text: data.candidates[0].content.parts[0].text,
                    model: model
                };
            } else {
                throw new Error('APIからの応答が不正です。');
            }

        } catch (error) {
            console.error('Gemini API Error:', error);
            throw error;
        }
    },

    /**
     * プロンプトを構築
     * @param {Object} config - 生成設定
     * @returns {string} - 生成されたプロンプト
     */
    buildPrompt(config) {
        let prompt = '';

        // システムプロンプト
        prompt += 'あなたはシチュエーションボイス・セリフ生成の専門家です。\n';
        prompt += '指定された設定に基づいて、自然で魅力的なセリフを生成してください。\n\n';

        // 用途
        const purposeText = this.getPurposeText(config.purpose, config.otherPurpose);
        prompt += `【用途】${purposeText}\n\n`;

        // セリフの長さ
        const lengthText = this.getLengthText(config.lengthType, config.lengthValue, config.lengthUnit, config.stage);
        prompt += `【セリフの長さ】${lengthText}\n\n`;

        // 入力内容（簡単入力 or 詳細入力）
        if (config.inputType === 'simple') {
            prompt += `【シチュエーション】\n${config.simpleText}\n\n`;
        } else {
            // 詳細入力
            prompt += '【シチュエーション設定】\n';
            if (config.location) prompt += `- 舞台/場所: ${config.location}\n`;
            if (config.timeOfDay) prompt += `- 時間帯: ${this.getTimeOfDayText(config.timeOfDay)}\n`;
            if (config.situation) prompt += `- 状況: ${config.situation}\n`;
            prompt += '\n';

            // キャラクター設定
            prompt += '【キャラクター設定】\n';
            if (config.character.name) prompt += `- 名前: ${config.character.name}\n`;
            if (config.character.gender) prompt += `- 性別: ${this.getGenderText(config.character.gender)}\n`;
            if (config.character.age) prompt += `- 年齢: ${config.character.age}\n`;
            if (config.character.personality) prompt += `- 性格: ${config.character.personality}\n`;
            if (config.character.tone) prompt += `- 口調: ${config.character.tone}\n`;
            if (config.character.voice) prompt += `- 声質: ${config.character.voice}\n`;
            if (config.character.role) prompt += `- 役割: ${config.character.role}\n`;
            prompt += '\n';
        }

        // 類似内容回避
        if (config.avoidSimilar) {
            const recentHistory = Storage.getRecentHistory(5);
            if (recentHistory.length > 0) {
                prompt += '【避けるべき内容】\n';
                prompt += '過去に生成された以下の内容とは異なるセリフを生成してください:\n\n';
                recentHistory.forEach((item, index) => {
                    prompt += `--- 過去の生成 ${index + 1} ---\n`;
                    prompt += item.result + '\n\n';
                });
            }
        }

        // 出力フォーマットの指示
        prompt += '【出力形式】\n';
        prompt += 'セリフのみを出力してください。余計な説明や注釈は不要です。\n';

        if (config.inputType === 'detailed' && config.character.name) {
            prompt += `キャラクター名「${config.character.name}」を使用してセリフを構成してください。\n`;
        }

        return prompt;
    },

    /**
     * 用途をテキストに変換
     */
    getPurposeText(purpose, otherPurpose) {
        const purposes = {
            'game': 'ゲームキャラクター',
            'drama': 'ボイスドラマ',
            'streamer': '配信者向けボイス',
            'anime': 'アニメ・漫画キャラ',
            'asmr': 'ASMR・癒し系',
            'other': otherPurpose || 'その他'
        };
        return purposes[purpose] || purpose;
    },

    /**
     * セリフの長さをテキストに変換
     */
    getLengthText(lengthType, lengthValue, lengthUnit, stage) {
        if (lengthType === 'count') {
            return `${lengthValue}セリフ程度`;
        } else if (lengthType === 'time') {
            const unit = lengthUnit === 'seconds' ? '秒' : '分';
            return `約${lengthValue}${unit}分の尺`;
        } else if (lengthType === 'stage') {
            const stages = {
                'single': '一つのセリフ（1〜2行）',
                'situation': 'シチュエーションボイス（5〜10セリフ）',
                'scene': '劇のワンシーン（10〜30セリフ）'
            };
            return stages[stage] || stage;
        }
        return '適量';
    },

    /**
     * 時間帯をテキストに変換
     */
    getTimeOfDayText(timeOfDay) {
        const times = {
            'morning': '朝',
            'noon': '昼',
            'evening': '夕方',
            'night': '夜',
            'midnight': '深夜',
            'unspecified': '不定'
        };
        return times[timeOfDay] || timeOfDay;
    },

    /**
     * 性別をテキストに変換
     */
    getGenderText(gender) {
        const genders = {
            'male': '男性',
            'female': '女性',
            'other': 'その他',
            'unknown': '不明'
        };
        return genders[gender] || gender;
    },

    /**
     * エラーメッセージを解析
     */
    parseError(status, errorData) {
        if (status === 400) {
            return 'リクエストが不正です。入力内容を確認してください。';
        } else if (status === 401 || status === 403) {
            return 'APIキーが無効です。設定画面で正しいAPIキーを登録してください。';
        } else if (status === 429) {
            return 'APIの利用制限に達しました。しばらく待ってから再度お試しください。';
        } else if (status === 500 || status === 503) {
            return 'APIサーバーでエラーが発生しました。時間をおいて再度お試しください。';
        } else {
            return errorData.error?.message || `API呼び出しに失敗しました (Status: ${status})`;
        }
    },

    /**
     * APIキーの有効性をテスト
     */
    async testApiKey(apiKey) {
        const url = `${this.BASE_URL}/gemini-2.0-flash-exp:generateContent?key=${apiKey}`;

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: 'こんにちは'
                        }
                    ]
                }
            ]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            return response.ok;
        } catch (error) {
            console.error('API Key Test Error:', error);
            return false;
        }
    }
};

// グローバルに公開
window.GeminiAPI = GeminiAPI;
