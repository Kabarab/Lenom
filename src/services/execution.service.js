const axios = require('axios');

// Функция для замены плейсхолдеров типа {{...}}
function replacePlaceholders(text, data) {
    if (!text) return '';
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
        return value;
    });
}

async function executeWorkflow(nodes, edges, triggerData) {
  console.log("--- Начинаем выполнение процесса ---");
  const startNode = nodes.find(node => !edges.some(edge => edge.target === node.id));
  if (!startNode) {
    return { success: false, message: "Не найден стартовый узел" };
  }

  let currentNode = startNode;
  const executionPath = [];
  // Это "конвейерная лента", на которой лежат данные
  let currentData = { trigger: triggerData };

  while (currentNode) {
    console.log(`Выполняется узел: ${currentNode.data.label || currentNode.id}`);

    if (currentNode.type === 'telegram') {
      try {
        const { botToken } = currentNode.data;
        // Берем chatId и message из данных на "конвейере"
        const chatId = replacePlaceholders(currentNode.data.chatId, currentData);
        const message = replacePlaceholders(currentNode.data.message, currentData);

        if (!botToken || !chatId) {
            throw new Error('Токен бота или ID чата не указаны или не найдены!');
        }

        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        await axios.post(url, { chat_id: chatId, text: message });
        console.log(`Сообщение успешно отправлено в Telegram: "${message}"`);

      } catch (error) {
        console.error("Ошибка узла Telegram:", error.response?.data || error.message);
        return { success: false, message: `Ошибка узла Telegram: ${error.message}` };
      }
    }

    executionPath.push(currentNode.data.label || currentNode.id);
    const currentEdge = edges.find(edge => edge.source === currentNode.id);
    if (!currentEdge) break;
    currentNode = nodes.find(node => node.id === currentEdge.target);
  }
  console.log("--- Выполнение завершено ---");
  return { success: true, message: "Процесс выполнен", path: executionPath };
}

module.exports = { executeWorkflow };
