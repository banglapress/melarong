const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config()
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
const fileUpload = require('express-fileupload');


const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


app.use(cors());
app.use(express.json());
app.use(fileUpload());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.20wwlvc.mongodb.net/?retryWrites=true&w=majority`;



const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {

    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }
    }
    next();
}

async function run() {
    try {
        await client.connect();

        const database = client.db('melaDB');
        const usersCollection = database.collection('users');
        const ordersCollection = database.collection("orders");
        const productsCollection = database.collection("products");
        const allproductsCollection = database.collection("allproducts");

        app.get('/products', async (req, res) => {
            let query = {};
            const category = req.query.category;
            if (category) {
                query = { category: category };
            }
            const cursor = await productsCollection.find(query);
            const posts = await cursor.toArray();
            res.send(posts);
        })

        app.post('/allproducts', async (req, res) => {
            const richText = req.body.richText;
            const productName = req.body.productName;
            const excerpt = req.body.excerpt;
            const category = req.body.category;
            const bannerHead = req.body.bannerHead;
            const stock = req.body.stock;
            const shipping = req.body.shipping;
            const price = req.body.price;
            const regularPrice = req.body.regularPrice;
            const rating = req.body.rating;
            const pic = req.files.image;
            const picData = pic.data;
            const encodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(encodedPic, 'base64')

            const post = {
                richText,
                productName,
                excerpt,
                category,
                bannerHead,
                stock,
                shipping,
                price,
                regularPrice,
                rating,
                image: imageBuffer
            }
            const result = await allproductsCollection.insertOne(post);
            res.json(result);
        })

        app.get('/allproducts', async (req, res) => {
            let query = {};
            const category = req.query.category;
            if (category) {
                query = { category: category };
            }
            const cursor = await allproductsCollection.find(query);
            const posts = await cursor.toArray();
            res.send(posts);
        })

        app.get('/orders', verifyToken, async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const cursor = ordersCollection.find(query);
            const orders = await cursor.toArray();
            res.json(orders);
        })

        app.get('/orders', async (req, res) => {
            const cursor = ordersCollection.find({});
            const orders = await cursor.toArray();
            res.json(orders);
        })
        //--ok
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = { $set: { status: 'Shipped' } };
            const result = await ordersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })


        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
        //--ok
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            console.log(result);
            res.json(result);
        });
        //--ok
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        //--ok
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                }
            }
            else {
                res.status(403).json({ message: 'you do not have access to make admin' })
            }

        })
        //--ok

        //--------------ORDERS API-------------------


        //--ok
        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const order = await ordersCollection.findOne(query);
            res.json(order);
        })

        app.post('/orders', async (req, res) => {
            const order = req.body;
            const result = await ordersCollection.insertOne(order);
            res.json(result);
        })

        app.delete('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await ordersCollection.deleteOne(query);
            res.json(result);
        })

        //Products API

        app.post('/products', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result)
        });

        app.get('/products', async (req, res) => {
            const cursor = productsCollection.find({});
            const result = await cursor.toArray();
            res.json(result);
        })


        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.json(product);
        })

        //--------------------ei porjonto no change
    }

    finally {
        //   await client.close();
    }

}


run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Melarong 21 June 2022 Server is OK. Database Running On Browser!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})