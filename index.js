// Importer les modules nécessaires
const express = require('express');
const cors = require('cors'); // N'oublie pas d'importer cors
const bodyParser = require('body-parser');
const pool = require('./db'); // Le fichier db.js pour la connexion à PostgreSQL

// Créer une application Express
const app = express();
const port = 3000; // Assure-toi que le port est défini

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public')); // Servir les fichiers HTML

// Route pour récupérer toutes les catégories
app.get('/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM categories');
        res.json(result.rows); // Envoyer les résultats sous forme de JSON
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour récupérer tous les produits
app.get('/produits', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produits');
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Ajouter une nouvelle catégorie
app.post('/categories', async (req, res) => {
    const { nom } = req.body;

    try {
        const result = await pool.query('INSERT INTO categories (nom) VALUES ($1) RETURNING *', [nom]);
        res.status(201).json({ message: 'Catégorie ajoutée avec succès', data: result.rows[0] });
    } catch (err) {
        console.error('Erreur lors de l\'insertion de la catégorie:', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});




// Ajouter un nouveau produit
app.post('/produits', async (req, res) => {
    const { nom, prix, categorie_id } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO produits (nom, prix, categorie_id) VALUES ($1, $2, $3) RETURNING *',
            [nom, prix, categorie_id]
        );
        res.status(201).json({ message: 'Produit ajouté avec succès', data: result.rows[0] });
    } catch (err) {
        console.error('Erreur lors de l\'insertion du produit:', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


// Modifier une catégorie
app.put('/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { nom } = req.body;

    try {
        const result = await pool.query(
            'UPDATE categories SET nom = $1 WHERE id = $2 RETURNING *',
            [nom, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Catégorie non trouvée' });
        }

        res.status(200).json({ message: 'Catégorie modifiée avec succès', data: result.rows[0] });
    } catch (err) {
        console.error('Erreur lors de la modification de la catégorie:', err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


//Mettre à jour un produit
app.put('/produits/:id', async (req, res) => {
    const { id } = req.params;
    const { nom, prix, categorie_id } = req.body;

    try {
        // Vérifier si la catégorie existe
        const categoryCheck = await pool.query('SELECT * FROM categories WHERE id = $1', [categorie_id]);
        if (categoryCheck.rowCount === 0) {
            return res.status(400).json({ error: 'La catégorie spécifiée n\'existe pas' });
        }

        // Mettre à jour le produit
        const result = await pool.query(
            'UPDATE produits SET nom = $1, prix = $2, categorie_id = $3 WHERE id = $4 RETURNING *',
            [nom, prix, categorie_id, id]
        );

        // Vérifier si le produit a été trouvé
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Produit non trouvé' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});



// Supprimer une catégorie après avoir supprimé ses produits associés
app.delete('/categories/:id', async (req, res) => {
    const { id } = req.params;

    try {
        // Supprimer tous les produits associés à cette catégorie
        await pool.query('DELETE FROM produits WHERE categorie_id = $1', [id]);

        // Supprimer la catégorie
        await pool.query('DELETE FROM categories WHERE id = $1', [id]);

        res.json({ message: 'Catégorie et produits associés supprimés' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});


// Supprimer un produit
app.delete('/produits/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM produits WHERE id = $1', [id]);
        res.json({ message: 'Produit supprimé' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les produits d'une catégorie spécifique
app.get('/categories/:id/produits', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query('SELECT * FROM produits WHERE categorie_id = $1', [id]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Route pour récupérer le nombre de catégories et de produits
app.get('/dashboard', async (req, res) => {
    try {
        const categoriesResult = await pool.query('SELECT COUNT(*) AS count FROM categories');
        const produitsResult = await pool.query('SELECT COUNT(*) AS count FROM produits');

        res.json({
            categories: parseInt(categoriesResult.rows[0].count),
            produits: parseInt(produitsResult.rows[0].count),
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

const { jsPDF } = require("jspdf");

// Route pour générer le PDF
app.get('/download-products-pdf', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM produits');
        const produits = result.rows;

        // Créer le PDF
        const doc = new jsPDF();
        doc.setFontSize(12);
        doc.text("Liste des Produits", 10, 10);
        doc.text("ID    Nom    Prix    Catégorie ID", 10, 20);

        produits.forEach((produit, index) => {
            doc.text(`${produit.id}    ${produit.nom}    ${produit.prix}    ${produit.categorie_id}`, 10, 30 + (index * 10));
        });

        // Télécharger le PDF
        doc.save("produits.pdf");
        res.status(200).send("PDF généré avec succès");
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
    }
});


// Lancer le serveur
app.listen(port, () => {
    console.log(`Serveur écoutant sur le port ${port}`);
});
