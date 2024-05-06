const express = require('express')
const axios = require('axios'); 
const app = express()
const port = 3000
require('dotenv').config();

// Créer une instance Axios personnalisée avec des en-têtes par défaut
let axiosInstance = axios.create({
    baseURL: process.env.BASE_URL, // URL de base de votre API externe
    headers: {
      'Content-Type': 'application/json', // Type de contenu par défaut
    }
  });

app.get('/', (req, res) => {
  res.send('Hello World!')
})

const tryLogin = async () => {
    try {
        const publicKey = process.env.PUBLIC_KEY;
        const privateKey = process.env.PRIVATE_KEY;

        // Les données JSON à envoyer dans le corps de la requête
        const data = {
            public_key: publicKey,
            private_key: privateKey
        };

        // Effectuer un appel à l'API externe
        const response = await axiosInstance.post('/auth', data);

        return response.data.token;
    }
    catch (error) {
        console.log(error);
    }
}

app.get('/login', async (req, res) => {
    try {
        const token = await tryLogin();
        res.json({ token: token });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const tryGetResidences = async (renewAuth=true) => {
    try {
        const response = await axiosInstance.get('/api3/crud/residences?projection=external_id&limit=999');
        return response;
    }
    catch (error) {
        if (renewAuth) {
            try {
                const token = await tryLogin();
                axiosInstance.defaults.headers.common['Authorization'] = 'Bearer ' + token;
                return tryGetResidences(false);
            }
            catch (error) {
                res.status(500).json({ error: error.message });
            }
        }
        else {
            throw error;
        }
    }
}

// Route pour déclencher un appel à une API externe
app.get('/refresh', async (req, res) => {
    try {
        const response = await tryGetResidences();
        const residences = response.data;

        const data = {
            do_refresh_relations: 'sync'
        };

        let retour = '';
        const promises = []
        await residences.items.map(item => item._id).forEach(id => {
            console.log('id : ' + id);
            try {
                promises.push(
                    axiosInstance.patch('api3/crud/residences/'+id, data)
                    .then((response) => {
                        console.log('OK : ' + id + '\n');
                        retour += 'OK : ' + id + '\n';
                    })
                );
            }
            catch (error) {
                console.log('KO : ' + id + '\n');
                retour += '/!\\KO : ' + id + '\n';
            }
        } );

        await Promise.all(promises);

        res.send(retour);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
  });


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})