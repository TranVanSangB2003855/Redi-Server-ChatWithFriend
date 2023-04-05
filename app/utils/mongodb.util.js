const mongoose = require("mongoose");

class MongoDB{
    static connect = async (uri) => {
        if(this.client) return this.client;
        mongoose.set('strictQuery', true);
        this.client = await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true
              })
        
        return this.client;
    }
}

module.exports = MongoDB;