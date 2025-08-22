const axios = require('axios');

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

async function executeWorkflow(nodes, edges, triggerData) {
    console.log("--- Начинаем выполнение процесса ---");
    const startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));
    if (!startNode) {
        return { success: false, message: "Не найден стартовый узел" };
    }

    let currentNode = startNode;
    const executionPath = [];
    // "Конвейерная лента" с данными. Сразу добавляем данные от триггера.
    let currentData = { trigger: triggerData };

    while (currentNode) {
        const nodeIdentifier = currentNode.data.label || currentNode.type || currentNode.id;
        console.log(`Выполняется узел: ${nodeIdentifier}`);
        executionPath.push(nodeIdentifier);

        // Обработка узла Telegram
        if (currentNode.type === 'telegram') {
            try {
                const nodeConfig = deepReplacePlaceholders(currentNode.data, currentData);
                const { botToken, chatId, message } = nodeConfig;

                if (!botToken || !chatId) {
                    throw new Error('Токен бота или ID чата не указаны!');
                }

                const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
                await axios.post(url, { chat_id: chatId, text: message });
                console.log(`Сообщение успешно отправлено в Telegram: "${message}"`);

            } catch (error) {
                console.error("Ошибка узла Telegram:", error.response?.data || error.message);
                return { success: false, message: `Ошибка узла Telegram: ${error.message}` };
            }
        }
        
        // --- НОВЫЙ БЛОК: Обработка HTTP-запроса ---
        if (currentNode.type === 'httpRequest') {
            try {
                // Заменяем плейсхолдеры во всех параметрах узла
                const config = deepReplacePlaceholders(currentNode.data, currentData);
                const { url, method = 'GET', headers, body } = config;

                if (!url) {
                    throw new Error('URL не указан в настройках HTTP-узла!');
                }
                
                console.log(`Выполняю ${method} запрос на: ${url}`);
                
                let parsedHeaders = headers;
                if (typeof headers === 'string') {
                    try {
                        parsedHeaders = JSON.parse(headers);
                    } catch (e) {
                        throw new Error('Заголовки (headers) имеют неверный JSON формат.');
                    }
                }

                let requestData = body;
                if (typeof body === 'string' && body.trim().startsWith('{')) {
                     try {
                        requestData = JSON.parse(body);
                     } catch(e) {
                        console.warn("Тело запроса выглядит как JSON, но не может быть обработано. Отправляется как строка.");
                     }
                }

                const response = await axios({
                    method,
                    url,
                    headers: parsedHeaders,
                    data: requestData
                });

                // Добавляем результат запроса в "конвейер" под именем узла
                currentData[currentNode.id] = response.data;
                console.log("Ответ от сервера успешно получен.");

            } catch (error) {
                 console.error("Ошибка HTTP-узла:", error.response?.data || error.message);
                return { success: false, message: `Ошибка HTTP-узла: ${error.message}` };
            }
        }
        // --- КОНЕЦ НОВОГО БЛОКА ---


        const currentEdge = edges.find(edge => edge.source === currentNode.id);
        if (!currentEdge) {
            console.log("Достигнут конец ветки.");
            break;
        }
        currentNode = nodes.find(node => node.id === currentEdge.target);
    }
    console.log("--- Выполнение завершено ---");
    return { success: true, message: "Процесс выполнен", path: executionPath };
}

module.exports = { executeWorkflow };