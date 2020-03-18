const Sequelize = require('sequelize');
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost/acme_db', { logging: false });
const faker = require('faker');
const moment = require('moment');

const Product = conn.define('product', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: Sequelize.STRING,
  description: Sequelize.TEXT,
  suggestedPrice: Sequelize.FLOAT
});

const Bookmark = conn.define('bookmark', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  url: {
    type: Sequelize.STRING(255*2),
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  rating: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 5 
  },
  category: {
    type: Sequelize.STRING(100),
    allowNull: false,
    defaultValue: ''
  },
  userId: {
    type: Sequelize.UUID,
    allowNull: false
  }
}, {
  hooks: {
    beforeCreate: async function(note){
      const count = await Bookmark.count({ where: { userId: note.userId }});
      if(count >= 10){
        throw ({ message: 'user can only have a max of 10 bookmarks' });
      }
    },
  }
});

const Note = conn.define('note', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  archived: {
    type: Sequelize.BOOLEAN,
    defaultValue: false,
    allowNull: false
  },
  text: {
    type: Sequelize.STRING(255*2),
    allowNull: false,
    validate: {
      notEmpty: true
    }
  }
}, {
  hooks: {
    beforeCreate: async function(note){
      const count = await Note.count({ where: { userId: note.userId }});
      if(count >= 5){
        throw ({ message: 'user can only have a max of 5 notes' });
      }
    },
    beforeSave: function(note){
      if(!note.userId){
        throw ({ message: 'note must belong to a user'});
      }

    }
  }
});

const User = conn.define('user', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  fullName: {
    type: Sequelize.VIRTUAL,
    get: function(){
      return `${this.firstName} ${ this.lastName } `;
    }
  },
  firstName: Sequelize.STRING,
  lastName: Sequelize.STRING,
  middleName: Sequelize.STRING,
  email: Sequelize.STRING,
  title: Sequelize.STRING,
  avatar: Sequelize.STRING,
  bio : Sequelize.TEXT
}, {
  defaultScope: {
    attributes: { exclude: ['bio'] }
  },
  scopes: {
    detail: {

    }
  },
  hooks: {
    beforeSave: (user)=> {
      user.bio = `${user.firstName } is a ${faker.company.bsAdjective()} ${faker.company.bsNoun()} sort of person. ${ faker.lorem.paragraph(1)} ${ user.lastName } sort of person. ${ faker.lorem.paragraph(1)}. Feel free to contact ${user.fullName } at ${user.email}. ${ faker.lorem.paragraph(1)}`;
    }
  }
});

const FollowingCompany = conn.define('following_company', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  rating: {
    type: Sequelize.INTEGER,
    defaultValue: 3,
    allowNull: false,
  }
}, {
  hooks: {
    beforeCreate: async function(following){
      const count = await FollowingCompany.count({ where: { userId: following.userId }});
      if(count >= 5){
        throw ({ message: 'user is already following 5 companies'});
      }
    },
    beforeSave: async function(following){
      const { companyId, userId } = following;
      if(!companyId || !userId){
        throw 'companyId and userId are required';
      }
      const found = await FollowingCompany.findOne({ where: { userId, companyId, id : { [Sequelize.Op.ne]: following.id } }});
      if(found){
        throw (new Error('already being followed'));
      }
    }
  }
});

const Vacation = conn.define('vacation', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  startDate: {
    type: Sequelize.DATE,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  endDate: {
    type: Sequelize.DATE,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
}, {
  hooks: {
    beforeCreate: async function(following){
      const count = await Vacation.count({ where: { userId: following.userId }});
      if(count >= 3){
        throw ({ message: 'user already has 3 vacations'});
      }
    },
    beforeSave: async function(vacation){
      const { userId, endDate, startDate } = vacation;
      if(!userId){
        throw 'userId are required';
      }
      if(endDate < startDate){
        throw ({ message: 'end date is less than start date'});
      } 
    }
  }
});


const CompanyProduct = conn.define('company_product', {
  price: Sequelize.FLOAT
});

const Company = conn.define('company', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  name: Sequelize.STRING,
  phone: Sequelize.STRING,
  state: Sequelize.STRING,
  catchPhrase: Sequelize.STRING
}, {
  hooks: {
    afterCreate: function(company){
      const limit = faker.random.number({ min: 1, max: 3});
      const yearEnds = [];
      const idx = 1;
      while(yearEnds.length < limit){
        const amount = faker.finance.amount(-2000, 5000, 2)*1;
        const fiscalYear = moment().add((yearEnds.length + 1)*(-1), 'year').endOf('year');
        yearEnds.push({ companyId: company.id, amount, fiscalYear });
      }
      return Promise.all(yearEnds.map( yearEnd => CompanyProfits.create(yearEnd)));
    }
  }
});

const CompanyProfits = conn.define('companyProfits', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  fiscalYear: Sequelize.DATE,
  amount: Sequelize.FLOAT
});

CompanyProfits.belongsTo(Company);
CompanyProduct.belongsTo(Product);
CompanyProduct.belongsTo(Company);

FollowingCompany.belongsTo(User);
FollowingCompany.belongsTo(Company);

User.hasMany(FollowingCompany);

User.belongsTo(Company);
Note.belongsTo(User);

Bookmark.belongsTo(User);

Vacation.belongsTo(User);

const domains = [
  'google',
  'yahoo',
  'friendster',
  'aol',
  'me',
  'mac',
  'microsoft'
];

Company.generate = (limit)=> {
  const items = [];
  while(items.length < limit){
    const name = faker.company.companyName();
    const phone = faker.phone.phoneNumber();
    const state = faker.address.state();
    const catchPhrase = faker.company.catchPhrase();
    items.push({
      name,
      phone,
      state,
      catchPhrase
    });
  }
  return items;
};

User.generate = (limit)=> {
  const users = [];
  while(users.length < limit){
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const middleName = faker.name.firstName();
    users.push({
      firstName: firstName, 
      lastName: lastName,
      middleName: middleName,
      avatar: faker.image.avatar(),
      email: `${firstName}.${middleName}.${lastName}@${faker.random.arrayElement(domains)}.com`,
      title: faker.name.jobTitle()
    });
  }
  return users;
};

const _sync = ()=> conn.sync({ force: true });

const seedFollowing = ({ users, companies })=> {
  return Promise.all(users.map( user => {
    const count = Math.ceil(Math.random()*4); 
    const _following = [];
    while(_following.length < count){
      const random = faker.random.arrayElement(companies); 
      if(!_following.includes(random)){
        _following.push(random);
      }
    }
    return Promise.all(_following.map( f => FollowingCompany.create({ userId: user.id, companyId: f.id, rating: faker.random.number({ min: 1, max: 5})})));
  }));
};

const seedNotes = ({ users })=> {
  return Promise.all(users.map( user => {
    const count = Math.ceil(Math.random()*4); 
    const _notes = [];
    while(_notes.length < count){
      _notes.push({ text: `${faker.lorem.words(2)} - ${ user.email } ${faker.lorem.words(3)}`, userId: user.id, archived: faker.random.boolean()}); 
    }
    return Promise.all(_notes.map( note => Note.create(note)));
  }));
};

const seedProducts = async (companies)=> {
  const names = ['foo', 'bar', 'bazz', 'quq', 'fizz', 'buzz' ];
  const products = await Promise.all(names.map( name => Product.create({ name, suggestedPrice: faker.random.number(20)  + 3, description: `${faker.commerce.productMaterial()} ${faker.company.catchPhrase()}` })));
  const promises = await Promise.all(companies.map( company => {
    const count = Math.ceil(Math.random()*3); 
    const _products = [];
    while(_products.length < count){
      const random = faker.random.arrayElement(products); 
      if(!_products.includes(random)){
        _products.push(random);
      }
    }
    return Promise.all(_products.map( p => CompanyProduct.create({ productId: p.id, companyId: company.id, price: p.suggestedPrice - (p.suggestedPrice * (faker.random.number(5)/100))})));
  }));

};

const _seed = async({ seedCompanies, seedUsers })=> {
  const companies = await Promise.all(seedCompanies.map( company => Company.create(company)))
  const products = await seedProducts(companies);
  seedUsers.forEach( user => user.companyId = faker.random.arrayElement(companies).id);
  const users = await Promise.all(seedUsers.map( user => User.create(user)))
  await seedFollowing({ users, companies });
  await seedNotes({ users });
}

const sync  = ()=> {
  const seedUsers = User.generate(200 + faker.random.number(30));
  const seedCompanies = Company.generate(8 + faker.random.number(3));
  return _sync({force: true })
    .then( async()=> {
      await _seed({ seedCompanies, seedProducts, seedUsers });
    });
};

module.exports = {
  sync,
  Bookmark,
  User,
  Company,
  Product,
  CompanyProduct,
  FollowingCompany,
  CompanyProfits,
  Vacation,
  Note
};
