const axios = require('axios');

// --- НОВАЯ ФУНКЦИЯ ---
// Функция для очистки PEM-ключа от лишних строк
function cleanApiKey(apiKey) {
    if (typeof apiKey !== 'string') return apiKey;

    // Удаляем стандартные заголовки и подписи PEM, а также первую строку с комментарием
    const cleanedKey = apiKey
        .replace("PLEASE DO NOT REMOVE THIS LINE! Yandex.Cloud SA Key ID <ajeemk07g7po5je25qdd>", "")
        .replace("-----BEGIN PRIVATE KEY-----", "")
        .replace("-----END PRIVATE KEY-----", "")
        .replace(/\s/g, ''); // Удаляем все пробелы и переносы строк

    return cleanedKey;
}


// Функция для замены плейсхолдеров типа {{...}}
function replacePlaceholders(text, data) {
    if (!text || typeof text !== 'string') return text;
    // Находим все вхождения {{path.to.value}}
    return text.replace(/{{(.*?)}}/g, (match, placeholder) => {
        // Разбираем путь: 'trigger.message.text' -> ['trigger', 'message', 'text']
        const path = placeholder.trim().split('.');
        // Ищем значение по этому пути в объекте данных
        let value = data;
        for (const key of path) {
            value = value?.[key];
            if (value === undefined) return match; // Если не нашли, возвращаем плейсхолдер
        }
        // Если значение - объект, вернем его как JSON-строку
        if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
        }
        return value;
    });
}

// Новая функция для рекурсивной замены плейсхолдеров в объектах и строках
function deepReplacePlaceholders(data, context) {
    if (typeof data === 'string') {
        return replacePlaceholders(data, context);
    }
    if (Array.isArray(data)) {
        return data.map(item => deepReplacePlaceholders(item, context));
    }
    if (typeof data === 'object' && data !== null) {
        const newData = {};
        for (const key in data) {
            newData[key] = deepReplacePlaceholders(data[key], context);
        }
        return newData;
    }
    return data;
}

async function executeWorkflow(nodes, edges, triggerData, triggerType = null) {
    console.log("--- Начинаем выполнение процесса ---");

    if (triggerType === 'TELEGRAM' && !triggerData.message?.text) {
        const reason = "Данные от Telegram не содержат текстового сообщения. Процесс не запущен.";
        console.log(`[Execution] ${reason}`);
        return { success: true, message: reason, path: [] };
    }

    let startNode;
    if (triggerType === 'TELEGRAM') {
        startNode = nodes.find(node => node.type === 'telegramTrigger');
    } else {
        startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));
    }

    if (!startNode) {
        const message = triggerType
            ? `Не найден стартовый узел (триггер) типа "${triggerType}"`
            : "Не найден стартовый узел";
        console.error(`[Execution] ОШИБКА: ${message}`);
        return { success: false, message };
    }

    let currentNode = startNode;
    const executionPath = [];
    let currentData = { trigger: triggerData };
    let previousNode = null;


    while (currentNode) {
        const nodeIdentifier = currentNode.data.label || currentNode.type || currentNode.id;
        console.log(`Выполняется узел: ${nodeIdentifier}`);
        executionPath.push(nodeIdentifier);
        
        // --- НОВАЯ ЛОГИКА АВТОПОДСТАНОВКИ ---
        // Если это первый узел после триггера и у него есть поле prompt/message
        if (previousNode && previousNode.type === 'telegramTrigger') {
            const nodeData = currentNode.data;
            // Если поле пустое, подставляем в него текст из триггера
            if ('prompt' in nodeData && !nodeData.prompt) {
                console.log(`Автоматически подставляем prompt из триггера для узла ${nodeIdentifier}`);
                nodeData.prompt = triggerData.message.text;
            }
            if ('message' in nodeData && !nodeData.message) {
                 console.log(`Автоматически подставляем message из триггера для узла ${nodeIdentifier}`);
                nodeData.message = triggerData.message.text;
            }
        }
        // --- КОНЕЦ НОВОЙ ЛОГИКИ ---

        if (currentNode.type === 'telegram') {
            try {
                const nodeConfig = deepReplacePlaceholders(currentNode.data, currentData);
                const { botToken, chatId, message } = nodeConfig;

                if (!botToken || !chatId) throw new Error('Токен бота или ID чата не указаны!');
                
                const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
                await axios.post(url, { chat_id: chatId, text: message });
                console.log(`Сообщение успешно отправлено в Telegram: "${message}"`);
            } catch (error) {
                console.error("Ошибка узла Telegram:", error.response?.data || error.message);
                return { success: false, message: `Ошибка узла Telegram: ${error.message}` };
            }
        }
        
        if (currentNode.type === 'httpRequest') {
            try {
                const config = deepReplacePlaceholders(currentNode.data, currentData);
                const { url, method = 'GET', headers, body } = config;

                if (!url) throw new Error('URL не указан в настройках HTTP-узла!');
                
                console.log(`Выполняю ${method} запрос на: ${url}`);
                
                let parsedHeaders = typeof headers === 'string' ? JSON.parse(headers) : headers;
                let requestData = typeof body === 'string' ? JSON.parse(body) : body;

                const response = await axios({ method, url, headers: parsedHeaders, data: requestData });
                currentData[currentNode.id] = response.data;
                console.log("Ответ от сервера успешно получен.");
            } catch (error) {
                 console.error("Ошибка HTTP-узла:", error.response?.data || error.message);
                return { success: false, message: `Ошибка HTTP-узла: ${error.message}` };
            }
        }

        if (currentNode.type === 'huggingFace') {
            try {
                const config = deepReplacePlaceholders(currentNode.data, currentData);
                const { hfToken, modelUrl, prompt } = config;

                if (!hfToken || !modelUrl || !prompt) {
                    throw new Error('Не указан API-токен, URL модели или запрос (prompt) для Hugging Face!');
                }

                console.log(`Отправляю запрос к модели Hugging Face: ${modelUrl}`);

                const response = await axios({
                    method: 'POST',
                    url: modelUrl,
                    headers: {
                        'Authorization': `Bearer ${hfToken}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        inputs: prompt
                    }
                });

                currentData[currentNode.id] = response.data;
                console.log("Ответ от Hugging Face успешно получен.");

            } catch (error) {
                console.error("Ошибка узла Hugging Face:", error.response?.data || error.message);
                return { success: false, message: `Ошибка узла Hugging Face: ${error.message}` };
            }
        }
        
        if (currentNode.type === 'chatGPT') {
            try {
                const config = deepReplacePlaceholders(currentNode.data, currentData);
                const { apiKey, prompt, model = 'gpt-3.5-turbo' } = config;

                if (!apiKey || !prompt) {
                    throw new Error('Не указан API-ключ или запрос (prompt) для ChatGPT!');
                }

                console.log(`Отправляю запрос к модели ChatGPT: ${model}`);

                const response = await axios({
                    method: 'POST',
                    url: 'https://api.openai.com/v1/chat/completions',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        model: model,
                        messages: [{ role: 'user', content: prompt }]
                    }
                });

                currentData[currentNode.id] = response.data;
                console.log("Ответ от ChatGPT успешно получен.");

            } catch (error) {
                console.error("Ошибка узла ChatGPT:", error.response?.data || error.message);
                return { success: false, message: `Ошибка узла ChatGPT: ${error.message}` };
            }
        }

        if (currentNode.type === 'yandexgpt') { 
            try {
                const config = deepReplacePlaceholders(currentNode.data, currentData);
                // --- ИЗМЕНЕНИЕ: Очищаем ключ перед использованием ---
                const apiKey = cleanApiKey(config.apiKey);
                const { folderId, prompt, model = 'yandexgpt-lite' } = config;

                if (!apiKey || !folderId || !prompt) {
                    throw new Error('Не указан API-ключ, Folder ID или запрос (prompt) для YandexGPT!');
                }

                console.log(`Отправляю запрос к модели YandexGPT: ${model}`);

                const response = await axios({
                    method: 'POST',
                    url: 'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
                    headers: {
                        'Authorization': `Api-Key ${apiKey}`,
                        'x-folder-id': folderId,
                        'Content-Type': 'application/json',
                    },
                    data: {
                        modelUri: `gpt://${folderId}/${model}`,
                        completionOptions: {
                          stream: false,
                          temperature: 0.6,
                          maxTokens: "2000"
                        },
                        messages: [{ role: 'user', text: prompt }]
                    }
                });

                currentData[currentNode.id] = response.data;
                console.log("Ответ от YandexGPT успешно получен.");

            } catch (error) {
                console.error("Ошибка узла YandexGPT:", error.response?.data || error.message);
                return { success: false, message: `Ошибка узла YandexGPT: ${error.message}` };
            }
        }


        const currentEdge = edges.find(edge => edge.source === currentNode.id);
        if (!currentEdge) {
            console.log("Достигнут конец ветки.");
            break;
        }
        previousNode = currentNode; // Запоминаем текущий узел перед переходом к следующему
        currentNode = nodes.find(node => node.id === currentEdge.target);
    }
    console.log("--- Выполнение завершено ---");
    return { success: true, message: "Процесс выполнен", path: executionPath };
}

module.exports = { executeWorkflow };