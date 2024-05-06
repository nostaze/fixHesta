const axios = require('axios'); 
require('dotenv').config();

// Créer une instance Axios personnalisée avec des en-têtes par défaut
let axiosInstance = axios.create({
    baseURL: process.env.BASE_URL, // URL de base de votre API externe
    headers: {
      'Content-Type': 'application/json', // Type de contenu par défaut
    }
  });

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
        throw error;
    }
}

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
                console.log('Erreur lors de la tentative de renouvellement du jeton : ' + error);
                throw error;
            }
        }
        else {
            console.log('Erreur lors de la récupération des résidences : ' + error);
            throw error;
        }
    }
}


const main = async () => {
    try {
        const response = await tryGetResidences();
        const residences = response.data;

        const data = {
            do_refresh_relations: 'sync'
        };

        let retour = '';
        const promises = []
        residences.items.map(item => item._id).forEach(id => {
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
        
        console.log('Fin de traitement');
    } catch (error) {
        console.error('Erreur lors de l\'appel à l\'API externe : ' + error);
    }
}

main();