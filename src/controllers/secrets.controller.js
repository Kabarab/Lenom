const db = require('../config/firebase');
const secretsCollection = db.collection('user_secrets');

const getSecrets = async (req, res) => {
    try {
        const userId = req.user.uid;
        const doc = await secretsCollection.doc(userId).get();

        if (!doc.exists) {
            return res.status(200).json({});
        }
        
        res.json(doc.data());

    } catch (error) {
        console.error("Ошибка получения ключей:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateSecrets = async (req, res) => {
    try {
        const userId = req.user.uid;
        const secretsData = req.body;

        // Удаляем любые поля с пустыми строками, чтобы не хранить их
        Object.keys(secretsData).forEach(key => {
            if (secretsData[key] === '' || secretsData[key] === null || secretsData[key] === undefined) {
                delete secretsData[key];
            }
        });

        await secretsCollection.doc(userId).set(secretsData, { merge: true });

        res.status(200).json({ message: 'Настройки успешно обновлены.' });

    } catch (error) {
        console.error("Ошибка обновления ключей:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getSecrets,
    updateSecrets
};

