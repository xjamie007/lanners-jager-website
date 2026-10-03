# SoftTouch API docs (Postman collection, abgerufen 2026-10-01)

### Who is SoftTouch?

SoftTouch was founded in 1999 as a one-man business developing, selling and installing point-of-sale systems. Knowing the market through and through became the basis for the service we offer today. In 2009 the company grew into a new office with ample demonstration space and a larger team. Today SoftTouch combines in-depth know-how of point-of-sale systems with that of the fashion world.

### What does this API do?

The SoftTouch API is a RESTful JSON API that reads data from, and writes data to, the FasMan database of a client: products and stock, customers, reservations and receipts, cheques, transfers and much more. Web shops, marketplaces, PIM and ERP systems, shipping and accounting integrations all connect through it.

### Getting started

- Base URL: `https://api.softtouch.eu/{{apiVersion}}/accounts/{{accountId}}/{{endpoint}}` – version `1` or `2`, followed by the account id of the client.

- Authentication: every call carries the token of the account in the `Authorization` header, with or without the `Bearer ` prefix (the API reads the last space-separated part of the header). Account id and token are provided by SoftTouch (see below).

- Format: send and receive JSON; set `Content-Type: application/json` and `Accept: application/json`.

- Paging: list calls return 100 records by default; `take` raises that to a maximum of 500 and `skip` skips the first n records. `take=500&skip=1500` returns records 1501 to 2000.

- display: most V1 list and detail calls accept `display=full` for the complete record; without it a compact record is returned. V2 calls use `select` instead (`select=*,relation.*`).

- Errors: a validation problem or an unknown model returns HTTP 400 with a `message` and, where useful, a list of `messages`; a missing record returns 404; a conflict (for example a login that already exists) returns 409. Always validate the response before relying on it. HTTP 500 means the API or the client's database was temporarily unavailable (a backup, a network problem): do not fail the customer's order on it, store the call and retry it a few minutes later.

### Keep calls to a minimum

Every call runs against the live database of the client, the same database their stores use at the till. Developers are required to keep the number of calls to the minimum their integration needs:

- Synchronise incrementally instead of fetching everything again, and cache the models that rarely change (stores, brands, categories, colors, size tables, program variables).

- Use filters and pages of up to 500 records rather than many small calls; fetch an article with `ids=` rather than size by size.

- Never poll in a tight loop; follow the schedule in Keeping a web shop in sync below.

SoftTouch checks the call volume of every integration weekly. When an integration keeps overloading the API, SoftTouch contacts the developer to bring the number of calls down.

### How to obtain an account id and token

The client requests an offer for the use of the API. Once the offer is confirmed, SoftTouch provides a test environment. When development is complete and the client has approved the integration, SoftTouch reviews the calls the integration makes and provides the live credentials.

Questions about this API can be sent to dev@softtouch.be.

### Keeping a web shop in sync

The API does not push changes to your system: your integration asks for them. The one exception is the confirmation URL the store's web shop module calls when an order is ready (see Receipts, Web shop orders). Three simple habits keep a web shop up to date without overloading the client's database.

#### Full sync overnight

Synchronise all online products once a night, together with the models they refer to: stores, seasons, brands, categories, colors, size tables and discounts. Set `discount_date` to the coming day when the sync starts the evening before, so the correct discounts are shown. A full sync belongs at night, or on demand when something changed; never in a loop during the day. Note that a backup runs on the server at night, which can briefly lock the data and cause a connection error; validate every response.

#### Ten minute sync

During the day, fetch only what changed: call the products endpoint every ten minutes and ask for the last fifteen: `updated_since_minutes=15` with `display=full`. The window is deliberately longer than the interval, so a slow call or a clock difference between your server and ours never makes you miss a change; a product that changed in the overlap is simply returned twice, and upserting it twice is harmless. Upsert what comes back, and take a product offline when the online flag of your channel is no longer set. When an unusually large number of products changed (a price import, a season switch), run a full sync instead of paging through thousands of changes. The Products folder describes the exact calls; `detail=stock` remains an option when only the stock matters.

#### On click sync

When a visitor opens a product page, fetch the article with `ids=` (the 8-digit article id + colour) so every size and store comes back in one call and the available sizes are current; check once more before checkout. A disappointed customer at checkout is better than one who already paid.

## V1
Version 1 is the most complete of the two API versions and will remain supported for a long time. Version 2 is built up gradually, resource by resource; adopt its endpoints when they offer something version 1 does not (article texts and photos as separate resources, supplier connections, looks, gift list headers and items), there is no need to migrate otherwise.

Every V1 URL is built the same way:

`https://api.softtouch.eu/1/accounts/{{accountId}}/{{endpoint}}`

List calls accept `take` (max. 500) and `skip`; most list and detail calls accept `display=full` for the complete record.

### V1 / Brands
#### Introduction

A brand is the supplier or label of an article: every product refers to exactly one brand through its three-character key. Brands carry the commercial defaults FasMan applies to their articles (mark-up, customer card behaviour, whether discount is allowed) and the contact details of the supplier.

Two names are stored. `name` is the administrative name; `alias` is the name to show to customers. A shop may split one label into several brands for purchasing reasons (for example "Marie Jo" and "Marie Jo Swim") and give them the same alias, so a web shop shows them as one brand. When no alias is set the field is an empty string, fall back to the name.

Brands can be filed in up to five brand categories (see Brand categories), which the client defines.

##### GET Brands
`https://api.softtouch.eu/1/accounts/{{accountId}}/brands?display=full`
Lists all brands. Like every list call, the result is limited to 500 records per call; use `take` and `skip` to page.

When to use it: during the nightly synchronisation, before the products, and to build a brand filter or brand page in the web shop. Cache the result; brands change rarely.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (3 characters), used as `brand` in products

- name: the administrative name of the brand

- alias: the name to show to customers; empty string when none is set

- category1 … category5: the brand categories, see Brand categories

With `display=full` the brand also returns supplier, address, postal_code, city, country_iso, telephone, telephone_2, fax, email, website, vat, miscellaneous, markup, size_table_id, commercial_discount, on_customer_card, customer_card_percentage, article_discount_allowed, active, stockbase and webshop_visible.
Example response `Brands` (200):
```json
[
    {
        "key": "001",
        "name": "SoftTouch",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    },
    {
        "key": "002",
        "name": "Xandres",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    },
    {
        "key": "003",
        "name": "Caroline Biss",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    },
    {
        "key": "004",
        "name": "State of Art",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    },
    {
        "key": "005",
        "name": "Brax",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    },
    {
        "key": "006",
        "name": "Marie Jo",
        "alias": "",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500"
    }
]
```

##### GET Brands/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/brands/001`
Fetches one brand by its key. The return values are the same as in the list call.

When to use it: when a product refers to a brand you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 3

 | display
 | string
 | full
Example response `Brands/{{id}}` (200):
```json
{
    "key": "001",
    "name": "Garder",
    "alias": "Gardeur WEB",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500"
}
```

##### POST Brands
`https://api.softtouch.eu/1/accounts/{{accountId}}/brands`
Creates a brand.

When to use it: only from integrations that create articles (PIM, supplier or marketplace feeds): an article must refer to an existing brand. Check the existing brands first; FasMan users prefer a short, clean list.

 | 

 | name
 | type
 | 

 | id
 | string
 | length 3; when omitted FasMan assigns the next free id

 | name
 | string
 | required

 | alias
 | string
 | the name shown to customers when several brands are grouped

 | supplier
 | string
 | supplier name when it differs from the brand

 | address, postal_code, city
 | string
 | 

 | country_iso
 | string
 | length 2

 | telephone, telephone_2, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | website
 | string
 | 

 | vat
 | string
 | VAT number

 | category1 … category5
 | string
 | length 4, from Brand categories; the key starts with the group (01 … 05)

 | miscellaneous
 | string
 | free text

 | margin
 | numeric
 | default mark-up used when purchase prices are entered

 | size_table_id
 | string
 | length 2, default size table for new articles of the brand

 | commercial_discount
 | numeric
 | default commercial discount on purchases

 | on_customer_card
 | boolean
 | whether articles of the brand count for the customer card, default true

 | customer_card_percentage
 | numeric
 | customer card percentage for the brand, when it deviates

 | article_discount_allowed
 | boolean
 | whether discount may be given on articles of the brand, default true

 | stockbase
 | boolean
 | the brand delivers through Stockbase

 | active
 | boolean
 | default true

The response is the created brand with `display=full` fields.
Request body:
```
{
    "id":                       "999",
    "name":                     "SoftTouch",
    "alias":                    "",
    "supplier":	                "",
    "address":                  "", 
    "postal_code":              "", 
    "city":                     "", 
    "country_iso":              "", 
    "telephone":                "", 
    "telephone_2":              "", 
    "fax":                      "", 
    "email":                    "", 
    "website":                  "", 
    "vat":                      "",
    "category1":                "0101",
    "category2":                "0201",
    "category3":                "0301",
    "category4":                "0401",
    "category5":                "0501",
    "miscellaneous":            "",
    "margin":                   2.7, 
    "size_table_id":            10,
    "commercial_discount":      1, 
    "on_customer_card":         true, 
    "customer_card_percentage": 0, 
    "article_discount_allowed": true,
    "active":                   true
}
```
Example response `Brands` (200):
```json
{
    "key": "249",
    "name": "SoftTouch",
    "alias": "",
    "category1": "0101",
    "category2": "0201",
    "category3": "0301",
    "category4": "0401",
    "category5": "0501"
}
```

##### POST Brands/bulk_insert
`https://api.softtouch.eu/1/accounts/{{accountId}}/brands/bulk_insert`
Creates up to 500 brands in one call. Each entry of the `brands` array has the same parameters as the single POST; the response is the list of created brands.

When to use it: for an initial import, for example when a client migrates from another system.

 | 

 | name
 | type
 | 

 | brands
 | array
 | required, max. 500 entries

 | brands[].name
 | string
 | required; the other fields as in the single POST
Request body:
```
{
    "brands":[
        {
            "id":                       "010",
            "name":                     "BulkImport1",
            "alias":                    "",
            "supplier":	                "",
            "address":                  "", 
            "postal_code":              "", 
            "city":                     "", 
            "country_iso":              "", 
            "telephone":                "", 
            "telephone_2":              "", 
            "fax":                      "", 
            "email":                    "", 
            "website":                  "", 
            "vat":                      "",
            "category1":                "0101",
            "category2":                "0201",
            "category3":                "0301",
            "category4":                "0401",
            "category5":                "0501",
            "miscellaneous":            "",
            "margin":                   2.7, 
            "size_table_id":            10,
            "commercial_discount":      1, 
            "on_customer_card":         true, 
            "customer_card_percentage": 0, 
            "article_discount_allowed": true,
            "active":                   true
        },
        {
            "id":                       "011",
            "name":                     "BulkImport2",
            "alias":                    "",
            "supplier":	                "",
            "address":                  "", 
            "postal_code":              "", 
            "city":                     "", 
            "country_iso":              "", 
            "telephone":                "", 
            "telephone_2":              "", 
            "fax":                      "", 
            "email":                    "", 
            "website":                  "", 
            "vat":                      "",
            "category1":                "0101",
            "category2":                "0201",
            "category3":                "0301",
            "category4":                "0401",
            "category5":                "0501",
            "miscellaneous":            "",
            "margin":                   2.7, 
            "size_table_id":            10,
            "commercial_discount":      1, 
            "on_customer_card":         true, 
            "customer_card_percentage": 0, 
            "article_discount_allowed": true,
            "active":                   true
        }
    ]
}
```
Example response `Brands/bulk_insert` (200):
```json
[
    {
        "key": "201",
        "name": "Marie Jo",
        "alias": "Marie Jo",
        "category1": "0101",
        "category2": "",
        "category3": "",
        "category4": "",
        "category5": ""
    },
    {
        "key": "202",
        "name": "Marie Jo Swim",
        "alias": "Marie Jo",
        "category1": "0101",
        "category2": "",
        "category3": "",
        "category4": "",
        "category5": ""
    }
]
```

##### PATCH Brands
`https://api.softtouch.eu/1/accounts/{{accountId}}/brands/001`
Updates a brand. Only the parameters that are sent are changed; the key cannot be changed.

When to use it: to keep supplier contact details or the alias in sync with a PIM, or to deactivate a brand the shop no longer sells.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 3

 | alias
 | string
 | the name shown to customers when several brands are grouped

 | supplier
 | string
 | supplier name when it differs from the brand

 | address, postal_code, city
 | string
 | 

 | country_iso
 | string
 | length 2

 | telephone, telephone_2, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | website
 | string
 | 

 | vat
 | string
 | VAT number

 | category1 … category5
 | string
 | length 4, from Brand categories; the key starts with the group (01 … 05)

 | miscellaneous
 | string
 | free text

 | margin
 | numeric
 | default mark-up used when purchase prices are entered

 | size_table_id
 | string
 | length 2, default size table for new articles of the brand

 | commercial_discount
 | numeric
 | default commercial discount on purchases

 | on_customer_card
 | boolean
 | whether articles of the brand count for the customer card, default true

 | customer_card_percentage
 | numeric
 | customer card percentage for the brand, when it deviates

 | article_discount_allowed
 | boolean
 | whether discount may be given on articles of the brand, default true

 | stockbase
 | boolean
 | the brand delivers through Stockbase

 | active
 | boolean
 | default true

The response is the updated brand with `display=full` fields.
Request body:
```
{
    "id":                       "005",
    "name":                     "SoftTouch",
    "alias":                    "",
    "supplier":	                "",
    "address":                  "Ambachtenlaan 6A", 
    "postal_code":              "9080", 
    "city":                     "Lochristi", 
    "country_iso":              "", 
    "telephone":                "", 
    "telephone_2":              "", 
    "fax":                      "", 
    "email":                    "", 
    "website":                  "", 
    "vat":                      "",
    "category1":                "",
    "category2":                "",
    "category3":                "",
    "category4":                "",
    "category5":                "",
    "miscellaneous":            "",
    "margin":                   1000, 
    "size_table_id":            10,
    "commercial_discount":      1, 
    "on_customer_card":         true, 
    "customer_card_percentage": 0, 
    "article_discount_allowed": true,
    "active":                   true,
    "stockbase":                false
}
```
Example response `Brands` (200):
```json
{
    "key": "005",
    "name": "SoftTouch",
    "alias": "",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500"
}
```

### V1 / Brand categories
#### Introduction

Brand categories are the five free classifications a client can give its brands: a segment (premium, mid-range), a purchasing group, a buyer, a country of origin, or whatever the client finds useful. They work like the product categories: the key has four characters, the first two are the group (01 to 05), the last two the id within the group. A brand refers to them in `category1` to `category5`.

The categories are defined by the client, so their meaning should be agreed with the client before you rely on them.

##### GET Brand_categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/brand_categories`
Lists the brand categories of all five groups. Like every list call, the result is limited to 500 records per call.

When to use it: only when the web shop groups or filters brands on one of these categories; fetch them together with the brands and cache them.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (4 characters); the first two are the group

- group: the group (01 … 05)

- description: the description of the category

- active: whether the category can still be assigned to brands
Example response `Brand_categories` (200):
```json
[
    {
        "key": "0101",
        "group": "01",
        "description": "Placeholder category 1",
        "active": true
    },
    {
        "key": "0102",
        "group": "01",
        "description": "Placeholder category 1",
        "active": true
    },
    {
        "key": "0201",
        "group": "02",
        "description": "Placeholder category 2",
        "active": true
    }
]
```

### V1 / Categories
#### Introduction

Articles are filed in categories: values that recur across many products, such as the sex (men, women, children) or the article group (trousers, shirts, accessories). There are seven category groups. The key of a category has four characters: the first two are the group (`0102` belongs to group 01, `0245` to group 02), the last two the id within the group, usually numeric but possibly alphabetic. For most clients group 01 is the sex and group 02 the article group; the other groups are defined by the client.

A product refers to its categories in `category1` to `category7`. The alias and the five language fields make it possible to show a category under another name, or in the language of the visitor.

##### GET Categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories`
Lists the categories of all groups, or of the groups given in `group_ids`. Like every list call, the result is limited to 500 records per call.

When to use it: during the nightly synchronisation, before the products, to build the navigation and filters of the web shop. Cache the result.

 | 

 | name
 | type
 | 

 | group_ids
 | string
 | comma separated groups, e.g. 01,02

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (4 characters)

- group_id: the group (01 … 07)

- description: the name of the category in FasMan

- alias: the name to show in the web shop

- lang1 … lang5: the name per language

- active: whether the category can be assigned to new products; inactive categories may still be used by existing products
Example response `Categories` (200):
```json
[
    {
        "key": "0101",
        "group_id": "01",
        "description": "Heren",
        "alias": "Heren",
        "lang1": "Heren",
        "lang2": "Men",
        "lang3": "Hommes",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0102",
        "group_id": "01",
        "description": "Dames",
        "alias": "Dames",
        "lang1": "Dames",
        "lang2": "Ladies",
        "lang3": "Femmes",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0201",
        "group_id": "02",
        "description": "Kleding",
        "alias": "",
        "lang1": "Kleding",
        "lang2": "",
        "lang3": "",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0202",
        "group_id": "02",
        "description": "Accessoires",
        "alias": "Accessoires",
        "lang1": "Accessoires",
        "lang2": "Accessories",
        "lang3": "Accessoires",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0301",
        "group_id": "03",
        "description": "Pull",
        "alias": "",
        "lang1": "Pull",
        "lang2": "",
        "lang3": "",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0302",
        "group_id": "03",
        "description": "T-shirt",
        "alias": "",
        "lang1": "T-shirt",
        "lang2": "",
        "lang3": "",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0303",
        "group_id": "03",
        "description": "Broek",
        "alias": "Broek",
        "lang1": "Broek",
        "lang2": "Pants",
        "lang3": "Pantalon",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0304",
        "group_id": "03",
        "description": "Armband",
        "alias": "Armband",
        "lang1": "Armband",
        "lang2": "Bracelet",
        "lang3": "Bracelet",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0401",
        "group_id": "04",
        "description": "Lange mouw",
        "alias": "",
        "lang1": "Lange mouw",
        "lang2": "",
        "lang3": "",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0402",
        "group_id": "04",
        "description": "Korte mouw",
        "alias": "Korte mouw",
        "lang1": "Korte mouw",
        "lang2": "Short sleeve",
        "lang3": "Manches courtes",
        "lang4": "",
        "lang5": "",
        "active": true
    }
]
```

##### GET Categories/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories/0101`
Fetches one category by its key. The return values are the same as in the list call.

When to use it: when a product refers to a category you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 4

 | display
 | string
 | full
Example response `Categories/{{id}}` (200):
```json
{
    "key": "0101",
    "group_id": "01",
    "description": "Heren",
    "alias": "Heren",
    "lang1": "Heren",
    "lang2": "Men",
    "lang3": "Hommes",
    "lang4": "",
    "lang5": "",
    "active": true
}
```

##### POST Categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories`
Creates a category in a group. The key is assigned by FasMan: the group followed by the next free id.

When to use it: from integrations that create articles and need a category that does not exist yet, for example a new article group from a supplier feed. Agree with the client before creating categories; they appear in every FasMan screen.

 | 

 | name
 | type
 | 

 | group_id
 | string
 | required, 01 … 07

 | description
 | string
 | the name in FasMan

 | alias
 | string
 | the name in the web shop

 | lang1 … lang5
 | string
 | the name per language

 | active
 | boolean
 | default true

The response is the created category.
Request body:
```
{
    "group_id": "01",
    "description": "Meisjes",
    "alias": "Meisjes",
    "lang1": "Meisjes",
    "lang2": "Girls",
    "lang3": "Filles",
    "lang4": "",
    "lang5": "",
    "active": true
}
```
Example response `Categories` (200):
```json
{
    "key": "0103",
    "group_id": "01",
    "description": "Meisjes",
    "alias": "Meisjes",
    "lang1": "Meisjes",
    "lang2": "Girls",
    "lang3": "Filles",
    "lang4": "",
    "lang5": "",
    "active": true
}
```

##### POST Categories/bulk_insert
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories/bulk_insert`
Creates several categories in one call. With `force_update: true`, entries whose description already exists in the group are updated instead of duplicated.

When to use it: for an initial import, when many categories have to be created at once.

 | 

 | name
 | type
 | 

 | categories
 | array
 | required, the categories to create

 | categories[].group_id
 | string
 | required, 01 … 07

 | categories[].description
 | string
 | required

 | categories[].alias, lang1 … lang5
 | string
 | 

 | categories[].active
 | boolean
 | default true

 | force_update
 | boolean
 | update existing categories with the same description

The response is the list of created (or updated) categories.
Request body:
```
{
    "categories":[
        {
            "group_id": "01",
            "description": "Jongens",
            "alias": "Jongens",
            "lang1": "Jongens",
            "lang2": "Boys",
            "lang3": "Garçons",
            "lang4": "",
            "lang5": "",
            "active": true
        },
        {
            "group_id": "01",
            "description": "Baby",
            "alias": "Baby",
            "lang1": "Baby",
            "lang2": "Baby",
            "lang3": "Bébé",
            "lang4": "",
            "lang5": "",
            "active": false
        }
    ],
    "force_update": true
}


```
Example response `Categories/bulk_insert` (200):
```json
[
    {
        "key": "0104",
        "group_id": "01",
        "description": "Jongens",
        "alias": "Jongens",
        "lang1": "Jongens",
        "lang2": "Boys",
        "lang3": "Garçons",
        "lang4": "",
        "lang5": "",
        "active": true
    },
    {
        "key": "0105",
        "group_id": "01",
        "description": "Baby",
        "alias": "Baby",
        "lang1": "Baby",
        "lang2": "Baby",
        "lang3": "Bébé",
        "lang4": "",
        "lang5": "",
        "active": false
    }
]
```

##### PATCH Categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories/0101`
Updates a category. The key and the group cannot be changed.

When to use it: to correct a description or translation, or to deactivate a category the client no longer uses.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 4

 | description
 | string
 | 

 | alias
 | string
 | 

 | lang1 … lang5
 | string
 | 

 | active
 | boolean
 | 

The response is the updated category.
Request body:
```
{
    "description": "Heren",
    "alias": "Heren",
    "lang1": "Heren",
    "lang2": "Men's",
    "lang3": "Hommes",
    "lang4": "",
    "lang5": "",
    "active": true
}
```
Example response `Categories` (200):
```json
{
    "key": "0101",
    "group_id": "01",
    "description": "Heren",
    "alias": "Heren",
    "lang1": "Heren",
    "lang2": "Men's",
    "lang3": "Hommes",
    "lang4": "",
    "lang5": "",
    "active": true
}
```

##### DELETE Categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/categories/0105`
Deletes a category. The response is `true` when the category was deleted. A category that is still used by products should be deactivated with PATCH instead.

When to use it: to clean up a category your integration created by mistake, before products refer to it.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 4
Example response `Categories` (200):
```json
true
```

### V1 / Cheques
#### Introduction

Cheques are the vouchers of FasMan: gift vouchers, article vouchers, commercial vouchers, advances and customer discount vouchers. Because the different types behave differently on a reservation or receipt, read this chapter before you use them.

#### Types

Every type is identified by a six-digit id starting with 9999. The id is the first part of the cheque number.

 | 

 | id
 | Type
 | Use

 | 999902
 | Gift voucher
 | The customer buys a voucher for family or friends and pays its value. When the voucher is used, its value is deducted from the amount to pay.

 | 999904
 | Article voucher
 | When vouchers and discounts make the total of a reservation or receipt negative, the customer does not get money back but receives an article voucher for the next purchase. This is the only type to use for that case, even when the negative total is caused by a gift voucher.

 | 999907
 | Commercial voucher
 | A gift from the store itself, for example a promotion code. It never has a positive value on a reservation: the store creates it and hands it out, the web shop only accepts it. Commercial vouchers can carry a `custom_code` such as "SUMMER20", a percentage instead of a value, and rules on how often they can be used.

 | 999903
 | Advance
 | The amount a customer paid in advance. Web shops rarely use this, since the customer pays the full amount.

 | 999905, 999909
 | Customer discount
 | The discount loyal customers earn with their customer card. Which of the two is used depends on the customer card type of the client; discuss it before you create these yourself.

 | 999701
 | Import voucher
 | A voucher issued by an external system and pre-loaded in FasMan with its own code.

#### Cheque number, checksum and barcode

Every cheque has a unique cheque number of 14 characters: `99` + the type id + a sequence number (a gift voucher starts with `99999902`). It also has a `checksum` of 8 characters. When a customer wants to use a cheque, always verify the combination of cheque number and checksum with the API (GET with `cheque` and `checksum`) before you accept it, and make sure the cheque is not `claimed` yet and not used twice on the same reservation.

Each cheque has a validity period (`fromdate` and `todate`). Whether the dates are enforced is usually a decision of the sales person; agree with the client whether the web shop should enforce them.

`label_barcode` is the number to print as an EAN-13 barcode so the cheque can be scanned at the point of sale; print it human readable as well.

`customer_card_value`, `one_scan_per_customer`, `unlimited_scans`, `is_percentage` and `custom_code` only apply to commercial vouchers; see the POST call.

##### GET Cheques
`https://api.softtouch.eu/1/accounts/{{accountId}}/cheques`
Lists cheques, or validates one. Like every list call, the result is limited to 500 records per call; use the filters rather than paging through everything.

When to use it: at checkout, to validate a voucher the customer enters (`cheque` + `checksum`, or `custom_code` for a commercial voucher); on a my account page, to show the customer's open vouchers (`customer_id`, `claimed=0`); or in a synchronisation of vouchers created in the stores (`since`, `updated_since_minutes`).

 | 

 | name
 | type
 | 

 | id
 | integer
 | one type of cheque, e.g. 999902 for gift vouchers

 | cheque
 | integer
 | the 14-digit cheque number, required together with checksum

 | checksum
 | string
 | required together with cheque

 | custom_code
 | string
 | the code of a commercial voucher; only with id 999907

 | customer_id
 | integer
 | cheques of one customer

 | label_barcode
 | integer
 | the EAN-13 printed on the cheque

 | claimed
 | boolean
 | 0 = not used yet, 1 = used

 | active
 | boolean
 | only cheques that are (not) active

 | validation_date
 | date
 | only cheques valid on this date

 | created_store_ids
 | string
 | comma separated store ids where the cheques were created

 | since
 | date
 | cheques created or changed since this date

 | updated_since_minutes
 | integer
 | cheques changed in the last n minutes

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the cheque number (14 digits)

- id: the type of cheque, see the folder description

- customer: the customer the cheque was made for; for type 999907 the cheque can only be used by this customer

- checksum: required when the cheque is used, except for commercial vouchers with a custom_code

- value: the value; a percentage when is_percentage is true

- description: the description printed on the cheque

- fromdate, todate: validity period, both dates included

- claimed: true when the cheque has been used

- label_barcode: the EAN-13 barcode

- customer_card_value: the amount deducted from the customer card when the cheque is used (commercial vouchers)

- one_scan_per_customer: the voucher can be used once per customer

- unlimited_scans: the voucher can be used any number of times

- is_percentage: the value is a percentage on the articles

- custom_code: the code a customer can enter instead of the cheque number

- type: a client specific sub-type of commercial voucher

With `display=full` the cheque also returns multiplier, multiplied_value, store_id_created, pos_id_created, processed, date_processed, ticket_processed, pos_id_processed and store_id_processed.
Example response `Cheques` (200):
```json
[
    {
        "key": 99999902001000,
        "id": 999902,
        "customer": 2,
        "checksum": "b7313c8b",
        "value": 50,
        "description": "Cadeaucheque [001000]",
        "fromdate": "2023-07-17",
        "todate": "9999-12-31",
        "claimed": false,
        "label_barcode": "9999020010001",
        "customer_card_value": 0,
        "one_scan_per_customer": false,
        "unlimited_scans": false,
        "is_percentage": false,
        "custom_code": "001000",
        "type": ""
    },
    {
        "key": 99999902001001,
        "id": 999902,
        "customer": 2,
        "checksum": "a1bcdda1",
        "value": 75,
        "description": "Cadeaucheque [001001]",
        "fromdate": "2023-07-17",
        "todate": "9999-12-31",
        "claimed": false,
        "label_barcode": "9999020010018",
        "customer_card_value": 0,
        "one_scan_per_customer": false,
        "unlimited_scans": false,
        "is_percentage": false,
        "custom_code": "001001",
        "type": ""
    },
    {
        "key": 99999907001001,
        "id": 999907,
        "customer": 2,
        "checksum": "03B48916",
        "value": 5,
        "description": "Verjaardagsbon",
        "fromdate": "2023-05-27",
        "todate": "2024-06-27",
        "claimed": false,
        "label_barcode": "9999070010013",
        "customer_card_value": 0,
        "one_scan_per_customer": false,
        "unlimited_scans": false,
        "is_percentage": true,
        "custom_code": "L83I8JOJZSJDFAYCMMEE",
        "type": ""
    },
    {
        "key": 99999907001002,
        "id": 999907,
        "customer": 3,
        "checksum": "97a4dc1b",
        "value": 5,
        "description": "Verjaardagsbon",
        "fromdate": "2023-07-17",
        "todate": "2023-08-17",
        "claimed": false,
        "label_barcode": "9999070010020",
        "customer_card_value": 0,
        "one_scan_per_customer": false,
        "unlimited_scans": false,
        "is_percentage": false,
        "custom_code": "happy_birthday",
        "type": ""
    },
    {
        "key": 99999907001003,
        "id": 999907,
        "customer": 0,
        "checksum": "b9f7fc48",
        "value": 5,
        "description": "1-time discount code",
        "fromdate": "2023-07-17",
        "todate": "2024-07-16",
        "claimed": false,
        "label_barcode": "9999070010037",
        "customer_card_value": 0,
        "one_scan_per_customer": true,
        "unlimited_scans": false,
        "is_percentage": false,
        "custom_code": "",
        "type": ""
    }
]
```

##### POST Cheques
`https://api.softtouch.eu/1/accounts/{{accountId}}/cheques`
Creates a cheque.

When to use it: when the web shop sells a gift voucher that is not on a receipt, when it must create an article voucher for a refund, or when a marketing tool creates commercial vouchers (promotion codes). Cheques that are bought or used on a receipt are created by the receipt itself; see Receipts.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, the type: 999902, 999903, 999904, 999905, 999907 or 999701

 | value
 | numeric
 | required, positive; a percentage when is_percentage is true

 | customer
 | integer
 | required for advances and customer discounts, recommended for article vouchers and gift vouchers; for commercial vouchers only when the voucher is personal

 | description
 | string
 | added to the default description; for commercial vouchers it replaces it, so give them a meaningful description

 | days_valid
 | integer
 | commercial vouchers only; default one year

 | customer_card_value
 | numeric
 | commercial vouchers only; the amount deducted from the customer card when the voucher is used

 | one_scan_per_customer
 | boolean
 | commercial vouchers only; the voucher can be used by many customers, once each

 | unlimited_scans
 | boolean
 | commercial vouchers only; no limit on the number of uses

 | is_percentage
 | boolean
 | commercial vouchers only; value is a percentage on all articles

 | custom_code
 | string
 | commercial and import vouchers; the code the customer enters, e.g. SUMMER20

 | type
 | string
 | commercial vouchers only, max. 5 characters; client specific sub-type

 | store_id
 | string
 | length 2, the store the cheque is created in

 | pos_id
 | string
 | length 4

The response is the created cheque, with its cheque number, checksum and label_barcode.
Request body:
```
{
    "id":                       999907,
    "value":                    5.00,
    "customer":                 3,
    "description":              "Verjaardagsbon",
    "days_valid":               31,
    "customer_card_value":      0,
    "one_scan_per_customer":    false,
    "unlimited_scans":          false,
    "is_percentage":            false,
    "custom_code":              "happy_birthday",
    "pos_id":                   "0101",
    "store_id":                 "01"
}
```
Example response `Cheques` (200):
```json
{
    "key": "99999907001002",
    "id": 999907,
    "customer": 3,
    "checksum": "97a4dc1b",
    "value": "5",
    "description": "Verjaardagsbon",
    "fromdate": "2023-07-17 00:00:00",
    "todate": "2023-08-17",
    "claimed": false,
    "label_barcode": "9999070010020",
    "customer_card_value": 0,
    "one_scan_per_customer": false,
    "unlimited_scans": false,
    "is_percentage": false,
    "custom_code": "happy_birthday",
    "type": null
}
```

##### POST Cheques/{{id}}/process
`https://api.softtouch.eu/1/accounts/{{accountId}}/cheques/99999902001000/process`
Marks a cheque as used (claimed) without a reservation or receipt. Only use it when the cheque is really consumed outside FasMan; a cheque that is used on a reservation or receipt is processed by that document and must not be processed here as well.

When to use it: for example when a voucher is redeemed on a marketplace that does not create receipts in FasMan.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the 14-digit cheque number

 | receipt_id
 | integer
 | the receipt the cheque was used on, for reference

 | date
 | date
 | the date of use, default today

 | store_id
 | string
 | length 2

 | pos_id
 | string
 | length 4

The response is the processed cheque.
Request body:
```
{
    "receipt_id":   1234567890,
    "date":         "2021-04-23",
    "pos_id":       "0101",
    "store_id":     "01"
}
```
Example response `Cheques/{{id}}/process` (200):
```json
{
    "key": 99999902001000,
    "id": 999902,
    "customer": 2,
    "checksum": "b7313c8b",
    "value": 50,
    "description": "Cadeaucheque [001000]",
    "fromdate": "2023-07-17",
    "todate": "9999-12-31",
    "claimed": true,
    "label_barcode": "9999020010001",
    "customer_card_value": 0,
    "one_scan_per_customer": false,
    "unlimited_scans": false,
    "is_percentage": false,
    "custom_code": "001000",
    "type": ""
}
```

### V1 / Colors
#### Introduction

Suppliers give each colour their own code and name: "R001 – Cherry", "A458 – Merlot", "Rose", "Crimson". A product keeps that supplier colour in `colorbrand`. To let customers filter on colour, FasMan also has a short list of generic colours (red, blue, black, …) that supplier colours are mapped to: the color model. Its id has four characters, usually numeric. The mapping is optional, so the `color` of a product can be an empty string.

The special colour "Multi color" is used for articles with several colours; its RGB and hex values have no meaning.

##### GET Colors
`https://api.softtouch.eu/1/accounts/{{accountId}}/colors`
Lists the generic colours. Like every list call, the result is limited to 500 records per call.

When to use it: during the nightly synchronisation, to build the colour filter of the web shop and to show a colour swatch (`colorhex`) next to the supplier colour name.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier (4 characters), used as `color` in products

- description: the colour name

- colorlong: the RGB value as one integer

- colorhex: the hex value, e.g. FF0000

- active: whether the colour can be assigned to new products

With `display=full` the colour also returns its descriptions per language.
Example response `Colors` (200):
```json
[
    {
        "id": "0001",
        "description": "ZWART",
        "colorlong": 0,
        "colorhex": "#000000",
        "active": true
    },
    {
        "id": "0020",
        "description": "GRIJS",
        "colorlong": 8421504,
        "colorhex": "#808080",
        "active": true
    },
    {
        "id": "0040",
        "description": "ZILVER",
        "colorlong": 12632256,
        "colorhex": "#c0c0c0",
        "active": true
    },
    {
        "id": "0100",
        "description": "WIT",
        "colorlong": 16777215,
        "colorhex": "#ffffff",
        "active": true
    },
    {
        "id": "0200",
        "description": "BRUIN",
        "colorlong": 16512,
        "colorhex": "#804000",
        "active": true
    },
    {
        "id": "0250",
        "description": "BEIGE",
        "colorlong": 32896,
        "colorhex": "#808000",
        "active": true
    },
    {
        "id": "0300",
        "description": "GROEN",
        "colorlong": 65280,
        "colorhex": "#00ff00",
        "active": true
    },
    {
        "id": "0400",
        "description": "BLAUW",
        "colorlong": 16744448,
        "colorhex": "#0080ff",
        "active": true
    },
    {
        "id": "0410",
        "description": "NAVY",
        "colorlong": 8388608,
        "colorhex": "#000080",
        "active": true
    },
    {
        "id": "0440",
        "description": "TURQUOISE",
        "colorlong": 13688896,
        "colorhex": "#40e0d0",
        "active": true
    },
    {
        "id": "0500",
        "description": "PAARS",
        "colorlong": 16711808,
        "colorhex": "#8000ff",
        "active": true
    },
    {
        "id": "0600",
        "description": "ROOD",
        "colorlong": 255,
        "colorhex": "#ff0000",
        "active": true
    },
    {
        "id": "0650",
        "description": "ROZE",
        "colorlong": 16744703,
        "colorhex": "#ff80ff",
        "active": true
    },
    {
        "id": "0700",
        "description": "GEEL",
        "colorlong": 65535,
        "colorhex": "#ffff00",
        "active": true
    },
    {
        "id": "0710",
        "description": "GOUD",
        "colorlong": 55295,
        "colorhex": "#ffd700",
        "active": true
    },
    {
        "id": "0800",
        "description": "ORANJE",
        "colorlong": 4227327,
        "colorhex": "#ff8040",
        "active": true
    },
    {
        "id": "0960",
        "description": "DIVERS",
        "colorlong": 16777215,
        "colorhex": "#ffffff",
        "active": true
    },
    {
        "id": "1000",
        "description": "Multi color",
        "colorlong": 0,
        "colorhex": "#000000",
        "active": true
    }
]
```

##### GET Colors/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/colors/0800`
Fetches one colour by its id. The return values are the same as in the list call.

When to use it: when a product refers to a colour you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 4

 | display
 | string
 | full
Example response `Colors/{{id}}` (200):
```json
{
    "id": "0800",
    "description": "ORANJE",
    "colorlong": 4227327,
    "colorhex": "#ff8040",
    "active": true
}
```

##### POST Colors
`https://api.softtouch.eu/1/accounts/{{accountId}}/colors`
Creates a generic colour.

When to use it: from integrations that create articles and map supplier colours to generic ones; agree the list with the client first.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 4

 | description
 | string
 | required

 | description_language_1 … description_language_5
 | string
 | the name per language

 | colorhex
 | string
 | hex value, e.g. FF0000; send either colorhex or colorlong

 | colorlong
 | integer
 | RGB value as one integer; send either colorhex or colorlong

 | active
 | boolean
 | default true

The response is the created colour.
Request body:
```
{
    "id": "1000",
    "description": "MULTICOLOR",
    "description_language_1": "Meerkleurig",
    "description_language_2": "Multicolore",
    "description_language_3": "Multicolor",
    "description_language_4": "",
    "description_language_5": "",
    "colorhex": "#000000",
    "active": true
}
```
Example response `Colors` (200):
```json
{
    "id": "1000",
    "description": "MULTICOLOR",
    "colorlong": 0,
    "colorhex": "#000000",
    "active": true
}
```

##### PATCH Colors
`https://api.softtouch.eu/1/accounts/{{accountId}}/colors/1000`
Updates a generic colour. The id cannot be changed.

When to use it: to correct a name, translation or hex value, or to deactivate a colour.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 4

 | description
 | string
 | 

 | description_language_1 … description_language_5
 | string
 | 

 | colorhex
 | string
 | send either colorhex or colorlong

 | colorlong
 | integer
 | 

 | active
 | boolean
 | 

The response is the updated colour.
Request body:
```
{
    "description": "Multi color",
    "description_language_1": "Meerkleurig",
    "description_language_2": "Multicolore",
    "description_language_3": "Multicolor",
    "description_language_4": "",
    "description_language_5": "",
    "colorhex": "#000000",
    "active": true
}
```
Example response `Colors` (200):
```json
{
    "id": "1000",
    "description": "Multi color",
    "colorlong": 0,
    "colorhex": "#000000",
    "active": true
}
```

### V1 / Corporations
#### Introduction

A corporation is a legal entity of the client: the company that invoices. A client with several companies (for example one per country) has several corporations, each with its own VAT number, invoice numbering and, when Peppol is used, its own Peppol identity. Stores are linked to a corporation, and invoices are always created for one corporation (see Invoices, where the corporation id is part of the URL).

##### GET Corporations
`https://api.softtouch.eu/1/accounts/{{accountId}}/corporations`
Lists the corporations of the client. Like every list call, the result is limited to 500 records per call.

When to use it: to know under which corporation an invoice must be created, and to print the legal details of the company on invoices or order confirmations.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- name: the name of the company

- address_1, address_2, postal_code, city, country_iso: the registered address

- vat: the VAT number

- active: whether the corporation is still in use

With `display=full` the corporation also returns gln, miscellaneous_1, miscellaneous_2, mail_body, oss_country_code, financial_year_start, financial_year_end, peppol_sender_id and peppol_sender_scheme.
Example response `Corporations` (200):
```json
[
    {
        "name": "Demo Vennootschap",
        "address_1": "Ambachtenlaan 6A",
        "address_2": "",
        "postal_code": "9080",
        "city": "Lochristi",
        "country_iso": "België",
        "vat": "BE 0506.847.665",
        "active": true
    }
]
```

### V1 / Countries
#### Introduction

The list of countries FasMan knows, keyed by their ISO 3166-1 alpha-2 code. Customers, addresses, brands and corporations refer to countries with this code (`country`, `country_iso`). The list is the same for every client.

##### GET Countries
`https://api.softtouch.eu/1/accounts/{{accountId}}/countries`
Lists all countries. Like every list call, the result is limited to 500 records per call; there are fewer countries than that, so one call returns them all.

When to use it: to fill the country selector of an address form with the codes FasMan accepts, and to translate the codes in customer and address records into names.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the ISO alpha-2 code, e.g. BE

- name: the English name of the country

With `display=full` the country also returns iso_3 (the alpha-3 code) and iso_num (the numeric code).
Example response `Countries` (200):
```json
[
    {
        "id": "AD",
        "name": "Andorra"
    },
    {
        "id": "AE",
        "name": "United Arab Emirates"
    },
    {
        "id": "AF",
        "name": "Afghanistan"
    },
    {
        "id": "AG",
        "name": "Antigua and Barbuda"
    },
    {
        "id": "AI",
        "name": "Anguilla"
    },
    {
        "id": "AL",
        "name": "Albania"
    },
    {
        "id": "AM",
        "name": "Armenia"
    },
    {
        "id": "AN",
        "name": "Netherlands Antilles"
    },
    {
        "id": "AO",
        "name": "Angola"
    },
    {
        "id": "AQ",
        "name": "Antarctica"
    },
    {
        "id": "AR",
        "name": "Argentina"
    },
    {
        "id": "AS",
        "name": "American Samoa"
    },
    {
        "id": "AT",
        "name": "Austria"
    },
    {
        "id": "AU",
        "name": "Australia"
    },
    {
        "id": "AW",
        "name": "Aruba"
    },
    {
        "id": "AZ",
        "name": "Azerbaijan"
    },
    {
        "id": "BA",
        "name": "Bosnia and Herzegovina"
    },
    {
        "id": "BB",
        "name": "Barbados"
    },
    {
        "id": "BD",
        "name": "Bangladesh"
    },
    {
        "id": "BE",
        "name": "Belgium"
    },
    {
        "id": "BF",
        "name": "Burkina Faso"
    },
    {
        "id": "BG",
        "name": "Bulgaria"
    },
    {
        "id": "BH",
        "name": "Bahrain"
    },
    {
        "id": "BI",
        "name": "Burundi"
    },
    {
        "id": "BJ",
        "name": "Benin"
    },
    {
        "id": "BL",
        "name": "St. Martin"
    },
    {
        "id": "BM",
        "name": "Bermuda"
    },
    {
        "id": "BN",
        "name": "Brunei Darussalam"
    },
    {
        "id": "BO",
        "name": "Bolivia"
    },
    {
        "id": "BQ",
        "name": "Caribbean Netherlands"
    },
    {
        "id": "BR",
        "name": "Brazil"
    },
    {
        "id": "BS",
        "name": "Bahamas"
    },
    {
        "id": "BT",
        "name": "Bhutan"
    },
    {
        "id": "BV",
        "name": "Bouvet Island"
    },
    {
        "id": "BW",
        "name": "Botswana"
    },
    {
        "id": "BY",
        "name": "Belarus"
    },
    {
        "id": "BZ",
        "name": "Belize"
    },
    {
        "id": "CA",
        "name": "Canada"
    },
    {
        "id": "CC",
        "name": "Cocos (Keeling) Islands"
    },
    {
        "id": "CD",
        "name": "Congo, the Democratic Republic of the"
    },
    {
        "id": "CF",
        "name": "Central African Republic"
    },
    {
        "id": "CG",
        "name": "Congo"
    },
    {
        "id": "CH",
        "name": "Switzerland"
    },
    {
        "id": "CI",
        "name": "Cote D'Ivoire"
    },
    {
        "id": "CK",
        "name": "Cook Islands"
    },
    {
        "id": "CL",
        "name": "Chile"
    },
    {
        "id": "CM",
        "name": "Cameroon"
    },
    {
        "id": "CN",
        "name": "China"
    },
    {
        "id": "CO",
        "name": "Colombia"
    },
    {
        "id": "CR",
        "name": "Costa Rica"
    },
    {
        "id": "CS",
        "name": "Serbia and Montenegro"
    },
    {
        "id": "CU",
        "name": "Cuba"
    },
    {
        "id": "CV",
        "name": "Cape Verde"
    },
    {
        "id": "CW",
        "name": "Curaçao"
    },
    {
        "id": "CX",
        "name": "Christmas Island"
    },
    {
        "id": "CY",
        "name": "Cyprus"
    },
    {
        "id": "CZ",
        "name": "Czech Republic"
    },
    {
        "id": "DE",
        "name": "Germany"
    },
    {
        "id": "DJ",
        "name": "Djibouti"
    },
    {
        "id": "DK",
        "name": "Denmark"
    },
    {
        "id": "DM",
        "name": "Dominica"
    },
    {
        "id": "DO",
        "name": "Dominican Republic"
    },
    {
        "id": "DZ",
        "name": "Algeria"
    },
    {
        "id": "EC",
        "name": "Ecuador"
    },
    {
        "id": "EE",
        "name": "Estonia"
    },
    {
        "id": "EG",
        "name": "Egypt"
    },
    {
        "id": "EH",
        "name": "Western Sahara"
    },
    {
        "id": "ER",
        "name": "Eritrea"
    },
    {
        "id": "ES",
        "name": "Spain"
    },
    {
        "id": "ET",
        "name": "Ethiopia"
    },
    {
        "id": "FI",
        "name": "Finland"
    },
    {
        "id": "FJ",
        "name": "Fiji"
    },
    {
        "id": "FK",
        "name": "Falkland Islands (Malvinas)"
    },
    {
        "id": "FM",
        "name": "Micronesia, Federated States of"
    },
    {
        "id": "FO",
        "name": "Faroe Islands"
    },
    {
        "id": "FR",
        "name": "France"
    },
    {
        "id": "GA",
        "name": "Gabon"
    },
    {
        "id": "GB",
        "name": "United Kingdom"
    },
    {
        "id": "GD",
        "name": "Grenada"
    },
    {
        "id": "GE",
        "name": "Georgia"
    },
    {
        "id": "GF",
        "name": "French Guiana"
    },
    {
        "id": "GH",
        "name": "Ghana"
    },
    {
        "id": "GI",
        "name": "Gibraltar"
    },
    {
        "id": "GL",
        "name": "Greenland"
    },
    {
        "id": "GM",
        "name": "Gambia"
    },
    {
        "id": "GN",
        "name": "Guinea"
    },
    {
        "id": "GP",
        "name": "Guadeloupe"
    },
    {
        "id": "GQ",
        "name": "Equatorial Guinea"
    },
    {
        "id": "GR",
        "name": "Greece"
    },
    {
        "id": "GS",
        "name": "South Georgia and the South Sandwich Islands"
    },
    {
        "id": "GT",
        "name": "Guatemala"
    },
    {
        "id": "GU",
        "name": "Guam"
    },
    {
        "id": "GW",
        "name": "Guinea-Bissau"
    },
    {
        "id": "GY",
        "name": "Guyana"
    },
    {
        "id": "HK",
        "name": "Hong Kong"
    },
    {
        "id": "HM",
        "name": "Heard Island and Mcdonald Islands"
    },
    {
        "id": "HN",
        "name": "Honduras"
    },
    {
        "id": "HR",
        "name": "Croatia"
    },
    {
        "id": "HT",
        "name": "Haiti"
    },
    {
        "id": "HU",
        "name": "Hungary"
    }
]
```

##### GET Countries/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/countries/BE`
Fetches one country by its ISO alpha-2 code. The return values are the same as in the list call.

When to use it: to validate a country code the customer entered, or to show the name of one country.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 2, e.g. BE

 | display
 | string
 | full
Example response `Countries/{{id}}` (200):
```json
{
    "id": "BE",
    "name": "Belgium"
}
```

### V1 / Customers
#### Introduction

A customer is the person or company that buys. Reservations, receipts, invoices, cheques and gift lists all refer to a customer; delivery and invoice addresses belong to a customer; and the customer record holds the web shop login and the customer card situation.

Orders without a known customer are usually booked on a "general customer" (often customer number 1, but this varies per client).

#### Logins

A customer can have a `login` and `password` for the web shop. The basic flow needs two calls: create the customer with a login (POST customers) and validate the login later (POST validate-login). A login that already exists results in a 409 error.

The API hashes the password itself: send it as the customer typed it, or hash it on your side, but send the same value at registration and at every login; the API cannot tell the difference. `active` doubles as the switch of the login: a customer with `active: false` is refused by validate-login, which makes it the natural flag for an e-mail validation step (create the login inactive, activate it once the customer clicked the link).

Many visitors already exist as a customer in the store but have no login yet. The extended flow uses the e-mail address to find them: look for the login (GET customers with `login`), then for the e-mail (GET customers with `email`), let the visitor pick the right customer, and add the login with PATCH. Keep in mind that one e-mail address can belong to several customers (a mother and a daughter, for example) while the login must be unique.

##### GET Customers
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers`
Lists customers, or searches them. Like every list call, the result is limited to 500 records per call. A shop easily has tens of thousands of customers, so filter.

When to use it: in the login and registration flow (`login`, `email`), to look up a customer at checkout, or to synchronise customers to a mailing tool (`modified_since`, `send_email`).

 | 

 | name
 | type
 | 

 | id
 | integer
 | one customer number

 | login
 | string
 | exact login

 | email
 | string
 | exact e-mail address

 | email_like
 | string
 | part of an e-mail address

 | name, first_name, last_name, company
 | string
 | contains

 | address, postal_code, city
 | string
 | contains

 | country
 | string
 | ISO code, length 2

 | telephone, mobile, phone_number
 | string
 | 

 | birthday
 | date
 | born on this date

 | birthdays
 | string
 | two dates separated by a comma: born between (day and month)

 | created_since, modified_since
 | date
 | created or changed since this date

 | miscellaneous
 | string
 | contains

 | accepted_gdpr
 | boolean
 | 

 | is_b2b
 | boolean
 | 

 | email_not_empty, email2_not_empty
 | boolean
 | 

 | send_email, send_email2
 | boolean
 | 

 | store_ids, pos_ids
 | string
 | comma separated, customers created in these stores or POS

 | national_register_id
 | integer
 | national register number (eID)

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (the customer number)

- firstname, name: first name and last name

- company: company name

- address, zip, city, country: the address; country is the ISO code

- telephone, mobile, email: contact details

- birthday: date of birth

- vatid: VAT number

- firstvisit, lastvisit: first and last purchase in the store or web shop

- faultysms, faultyemail, faultymail: the mobile number, e-mail address or postal address was found to be wrong

- sendsms, sendemail, sendmail: the customer accepts SMS, e-mail and postal mailings

- active: whether the customer can be used

- login, lastlogin: the web shop login and the date of the last login

- created, createdby, modified, modifiedby: audit fields (dates and FasMan user ids)

- pos_id, store_id: where the customer was created

- category1 … category10: customer categories, see Customer categories; typical uses are language, salutation and customer segment

- miscellaneous: free text

- timestamp: last change of the record

- gets_direct_discount, direct_discount_percentage: VIP customers receive this percentage directly on their articles; when an article already has a higher discount, the higher one applies

- customer_card_revenue, customer_card_percentage, customer_card_discount, customer_card_lines, customer_card_points: the customer card situation (which of these matter depends on the customer card type of the client)

- cards: when the client keeps a customer card per store or store group, the situation per card is here and the fields above should be ignored

With `display=full` the customer also returns email2, faultyemail2, sendemail2, send_eticket and accepted_gdpr_at.
Example response `Customers` (200):
```json
[
    {
        "key": 1,
        "firstname": "",
        "name": "Algemene klant",
        "company": "",
        "address": "",
        "zip": "",
        "city": "",
        "country": "",
        "telephone": "",
        "mobile": "",
        "email": "",
        "birthday": "2001-01-01",
        "vatid": "",
        "firstvisit": "2016-07-01",
        "lastvisit": "2023-03-13",
        "accepted_gdpr_at": null,
        "faultysms": false,
        "sendsms": true,
        "faultyemail": false,
        "sendemail": true,
        "faultymail": false,
        "sendmail": true,
        "active": null,
        "login": null,
        "lastlogin": null,
        "created": "2016-07-01",
        "createdby": "1001",
        "modified": "2023-03-13",
        "modifiedby": "1001",
        "pos_id": "0101",
        "store_id": "00",
        "salutation_id": "9000",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500",
        "category6": "0600",
        "category7": "0700",
        "category8": "0800",
        "category9": "0900",
        "category10": "1000",
        "miscellaneous": "",
        "timestamp": "2023-03-13 11:54:46",
        "gets_direct_discount": false,
        "direct_discount_percentage": 0,
        "customer_card_revenue": 0,
        "customer_card_percentage": 0,
        "customer_card_discount": 0,
        "customer_card_lines": 0,
        "customer_card_points": 0,
        "cards": [],
        "is_b2b": false
    },
    {
        "key": 2,
        "firstname": "Stefan",
        "name": "de Bakker",
        "company": "SoftTouch BV",
        "address": "Ambachtenlaan 6A",
        "zip": "9080",
        "city": "Lochristi",
        "country": "BE",
        "telephone": "09/219.00.83",
        "mobile": "",
        "email": "dev@softtouch.be",
        "birthday": "1989-05-27",
        "vatid": "",
        "firstvisit": "2016-01-11",
        "lastvisit": "2023-07-17",
        "accepted_gdpr_at": "2021-04-23 00:00:00",
        "faultysms": false,
        "sendsms": true,
        "faultyemail": false,
        "sendemail": true,
        "faultymail": false,
        "sendmail": true,
        "active": true,
        "login": "stefan@softtouch.be",
        "lastlogin": "2023-07-20 00:00:00",
        "created": "2023-04-11",
        "createdby": "1001",
        "modified": "2023-07-17",
        "modifiedby": "1001",
        "pos_id": "0101",
        "store_id": "01",
        "salutation_id": "9001",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500",
        "category6": "0600",
        "category7": "0700",
        "category8": "0800",
        "category9": "0900",
        "category10": "1000",
        "miscellaneous": "",
        "timestamp": "2023-07-17 12:42:41",
        "gets_direct_discount": true,
        "direct_discount_percentage": 10,
        "customer_card_revenue": 743,
        "customer_card_percentage": 5,
        "customer_card_discount": 37.15,
        "customer_card_lines": 0,
        "customer_card_points": 0,
        "cards": [],
        "is_b2b": false
    },
    {
        "key": 3,
        "firstname": "Jeremy",
        "name": "Clarkson",
        "company": "",
        "address": "Chipping Norton Road 5",
        "zip": "OX7 3PE",
        "city": "Chadlington",
        "country": "GB",
        "telephone": "",
        "mobile": "",
        "email": "",
        "birthday": "2001-01-01",
        "vatid": "",
        "firstvisit": "2023-07-03",
        "lastvisit": "2023-07-03",
        "accepted_gdpr_at": null,
        "faultysms": false,
        "sendsms": true,
        "faultyemail": false,
        "sendemail": true,
        "faultymail": false,
        "sendmail": true,
        "active": null,
        "login": null,
        "lastlogin": null,
        "created": "2023-07-03",
        "createdby": "1001",
        "modified": "2023-07-03",
        "modifiedby": "1001",
        "pos_id": "0101",
        "store_id": "00",
        "salutation_id": "9001",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500",
        "category6": "0600",
        "category7": "0700",
        "category8": "0800",
        "category9": "0900",
        "category10": "1000",
        "miscellaneous": "",
        "timestamp": "2023-07-03 10:58:21",
        "gets_direct_discount": false,
        "direct_discount_percentage": 0,
        "customer_card_revenue": 0,
        "customer_card_percentage": 0,
        "customer_card_discount": 0,
        "customer_card_lines": 0,
        "customer_card_points": 0,
        "cards": [],
        "is_b2b": false
    },
    {
        "key": 4,
        "firstname": "John",
        "name": "Doe",
        "company": "",
        "address": "Hoofdstraat 123",
        "zip": "1000",
        "city": "Bruxelles",
        "country": "BE",
        "telephone": "",
        "mobile": "",
        "email": "",
        "birthday": "2001-01-01",
        "vatid": "",
        "firstvisit": "2023-07-03",
        "lastvisit": "2023-07-03",
        "accepted_gdpr_at": null,
        "faultysms": false,
        "sendsms": true,
        "faultyemail": false,
        "sendemail": true,
        "faultymail": false,
        "sendmail": true,
        "active": null,
        "login": null,
        "lastlogin": null,
        "created": "2023-07-03",
        "createdby": "1001",
        "modified": "2023-07-03",
        "modifiedby": "1001",
        "pos_id": "0101",
        "store_id": "00",
        "salutation_id": "9001",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500",
        "category6": "0600",
        "category7": "0700",
        "category8": "0800",
        "category9": "0900",
        "category10": "1000",
        "miscellaneous": "",
        "timestamp": "2023-07-03 10:59:27",
        "gets_direct_discount": false,
        "direct_discount_percentage": 0,
        "customer_card_revenue": 0,
        "customer_card_percentage": 0,
        "customer_card_discount": 0,
        "customer_card_lines": 0,
        "customer_card_points": 0,
        "cards": [],
        "is_b2b": false
    },
    {
        "key": 5,
        "firstname": "Bert",
        "name": "Van de Vyver",
        "company": "SoftTouch BV",
        "address": "Ambachtenlaan 6A",
        "zip": "9080",
        "city": "Lochristi",
        "country": "BE",
        "telephone": "",
        "mobile": "",
        "email": "bert.vdv@softtouch.be",
        "birthday": "1995-09-21",
        "vatid": "",
        "firstvisit": "2021-04-23",
        "lastvisit": "2021-04-23",
        "accepted_gdpr_at": "2021-04-23 00:00:00",
        "faultysms": false,
        "sendsms": true,
        "faultyemail": false,
        "sendemail": true,
        "faultymail": false,
        "sendmail": true,
        "active": true,
        "login": "bert.vandevyver@softtouch.be",
        "lastlogin": "2021-04-23 00:00:00",
        "created": "2023-07-03",
        "createdby": "1001",
        "modified": "2023-07-03",
        "modifiedby": "1001",
        "pos_id": "0101",
        "store_id": "01",
        "salutation_id": "9001",
        "category1": "0100",
        "category2": "0200",
        "category3": "0300",
        "category4": "0400",
        "category5": "0500",
        "category6": "0600",
        "category7": "0700",
        "category8": "0800",
        "category9": "0900",
        "category10": "1000",
        "miscellaneous": "",
        "timestamp": "2023-07-03 11:07:36",
        "gets_direct_discount": false,
        "direct_discount_percentage": 0,
        "customer_card_revenue": 0,
        "customer_card_percentage": 0,
        "customer_card_discount": 0,
        "customer_card_lines": 0,
        "customer_card_points": 0,
        "cards": [],
        "is_b2b": false
    }
]
```

##### GET Customers/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2`
Fetches one customer by number. The return values are the same as in the list call.

When to use it: on the my account page, to show the profile and the customer card situation of the logged-in customer.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | display
 | string
 | full
Example response `Customers/{{id}}` (200):
```json
{
    "key": 2,
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "dev@softtouch.be",
    "birthday": "2001-01-01",
    "vatid": "",
    "firstvisit": "2023-04-11",
    "lastvisit": "2023-04-11",
    "accepted_gdpr_at": null,
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": null,
    "login": null,
    "lastlogin": null,
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-03",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "00",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 10:21:55",
    "gets_direct_discount": false,
    "direct_discount_percentage": 0,
    "customer_card_revenue": 0,
    "customer_card_percentage": 0,
    "customer_card_discount": 0,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

##### POST Customers
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers`
Creates a customer, with or without a web shop login. When the login already exists the customer is not created and a `409` error with the message Login already exists is returned.

When to use it: when a visitor registers in the web shop, or when a guest checks out for the first time (create the customer without login). Check for an existing customer by e-mail first, so the store does not end up with duplicates.

 | 

 | name
 | type
 | 

 | name
 | string
 | required, the last name (or company name for a business customer)

 | firstname
 | string
 | 

 | salutation_id
 | string
 | length 4, a customer category of the salutation group

 | company
 | string
 | 

 | address, zip, city
 | string
 | at least an address is expected

 | country
 | string
 | ISO code, length 2

 | telephone, mobile
 | string
 | 

 | email, email2
 | string
 | valid e-mail addresses

 | birthday
 | date
 | YYYY-MM-DD

 | vatid
 | string
 | 

 | firstvisit, lastvisit
 | date
 | 

 | accepted_gdpr_at
 | date or null
 | when the customer accepted the privacy policy

 | faultysms, sendsms, faultyemail, sendemail, faultyemail2, sendemail2, faultymail, sendmail, send_eticket
 | boolean
 | mailing preferences and validity flags

 | active
 | boolean
 | default true

 | login
 | string
 | web shop login, required together with password; must be unique

 | password
 | string
 | required together with login; hashed and stored by the API, never returned

 | lastlogin
 | date
 | 

 | category1 … category10
 | string
 | length 4, see Customer categories

 | miscellaneous
 | string
 | free text

 | pos_id
 | string
 | length 4, where the customer is created

 | store_id
 | string
 | length 2

 | is_b2b
 | boolean
 | business customer, default false

The response is the created customer with `display=full` fields.
Request body:
```
{
    "salutation_id": "9001",
    "firstname": "Bert",
    "name": "Van de Vyver",
    "company": "SoftTouch BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "",
    "mobile": "",
    "email": "dev@softtouch.be",
    "email2": "bert.vdv@softtouch.be",
    "birthday": "1995/09/21",
    "vatid": "",
    "firstvisit": "2021/04/23",
    "lastvisit": "2021/04/23",
    "accepted_gdpr_at": "2021/04/23",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultyemail2": false,
    "sendemail2": true,
    "faultymail": false,
    "sendmail": true,
    "send_eticket": true,
    "active": true,
    "login": "bert.vdv@softtouch.be",
    "password": "1234pass",
    "lastlogin": "2023/07/03",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "pos_id": "0101",
    "store_id": "01",
    "is_b2b": false
}
```
Example response `Customers` (200):
```json
{
    "key": 5,
    "firstname": "Bert",
    "name": "Van de Vyver",
    "company": "SoftTouch BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "",
    "mobile": "",
    "email": "dev@softtouch.be",
    "birthday": "1995/09/21",
    "vatid": "",
    "firstvisit": "2021/04/23",
    "lastvisit": "2021/04/23",
    "accepted_gdpr_at": "2021/04/23",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": true,
    "login": "bert.vdv@softtouch.be",
    "lastlogin": "2023/07/03",
    "created": "2023-07-03 00:00:00",
    "createdby": "1001",
    "modified": "2023-07-03 00:00:00",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "01",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 11:03:57",
    "gets_direct_discount": false,
    "direct_discount_percentage": 0,
    "customer_card_revenue": 0,
    "customer_card_percentage": 0,
    "customer_card_discount": 0,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

##### POST Customers/validate-login
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/validate-login?login=stefan@softtouch.be&password=pass1234`
Checks a login and password. When they match, the customer with all its details is returned; otherwise a `404` error with Model not found. Send exactly the value you sent as `password` when the login was created. A customer with `active: false` is refused as well, so do not present every 404 as a wrong password when you use `active` for e-mail validation.

When to use it: on every web shop login.

 | 

 | name
 | type
 | 

 | login
 | string
 | required

 | password
 | string
 | required

 | is_b2b
 | boolean
 | only accept business customers
Example response `Customers/validate-login` (200):
```json
{
    "key": 2,
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "SoftTouch Vlaanderen BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "stefan@softtouch.be",
    "birthday": "1989-05-27",
    "vatid": "",
    "firstvisit": "2016-01-13",
    "lastvisit": "2023-07-20",
    "accepted_gdpr_at": "2021-04-23 00:00:00",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": true,
    "login": "stefan@softtouch.be",
    "lastlogin": "2023-07-03 11:09:48",
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-03",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "01",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 11:09:07",
    "gets_direct_discount": true,
    "direct_discount_percentage": 10,
    "customer_card_revenue": 743,
    "customer_card_percentage": 5,
    "customer_card_discount": 37.15,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

##### POST Customers/{{id}}/add_value_to_discount
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/add_value_to_discount?value=32.15`
Adds an amount to the saved customer card discount of a customer.

When to use it: only in agreement with the client, for example to compensate a customer or to migrate customer card balances from another system. Regular purchases update the customer card through receipts; never use this call to mirror sales.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | value
 | numeric
 | required, the amount to add (negative to deduct)

The response is the updated customer.
Example response `Customers/{{id}}/add_value_to_discount` (200):
```json
{
    "key": 2,
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "SoftTouch Vlaanderen BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "stefan@softtouch.be",
    "birthday": "1989-05-27",
    "vatid": "",
    "firstvisit": "2016-01-13",
    "lastvisit": "2023-07-20",
    "accepted_gdpr_at": "2021-04-23 00:00:00",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": true,
    "login": "stefan@softtouch.be",
    "lastlogin": "2023-07-20 00:00:00",
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-03 00:00:00",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "01",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 11:09:07",
    "gets_direct_discount": true,
    "direct_discount_percentage": 10,
    "customer_card_revenue": 743,
    "customer_card_percentage": 5,
    "customer_card_discount": 37.15,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

##### POST Customers/{{id}}/customer_card
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/customer_card`
Sets the customer card of a customer: its type, direct discount, saved amounts, points and validity. When the client uses customer card groups, the card of the group of the given store is updated.

When to use it: only in agreement with the client: migrations, or a loyalty programme that is managed outside FasMan. The receipt logic keeps the card up to date in normal operation.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | klk_type
 | string
 | the customer card type

 | klk_direct
 | boolean
 | the customer gets direct discount

 | klk_direct_pct
 | integer
 | the direct discount percentage

 | klk_saldo
 | boolean
 | 

 | klk_total
 | numeric
 | revenue counted for the card; required together with klk_discount and klk_pct

 | klk_pct
 | integer
 | the discount percentage; required together with klk_total and klk_discount

 | klk_discount
 | numeric
 | the saved discount; required together with klk_total and klk_pct

 | klk_lines
 | integer
 | the counted lines

 | klk_number
 | integer
 | 

 | klk_valid_until
 | date
 | 

 | klk_points
 | integer
 | the saved points

 | klk_freq
 | integer
 | the counted visits

 | first_visit, last_visit
 | date
 | 

 | divers
 | string
 | free text

 | hist_remark
 | string
 | remark written in the customer card history

 | store_id
 | string
 | length 2; decides the customer card group

 | pos_id
 | string
 | length 4

 | user_id
 | string
 | FasMan user id, length 4

The response is the updated customer.
Request body:
```
{
    "klk_discount": 5,
    "klk_total": 100,
    "klk_pct": 5,
    "hist_remark": "BERT"
}
```
Example response `Customers/{{id}}/customer_card` (200):
```json
{
    "key": 2,
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "SoftTouch Vlaanderen BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "stefan@softtouch.be",
    "birthday": "1989-05-27",
    "vatid": "",
    "firstvisit": "2016-01-13 00:00:00",
    "lastvisit": "2023-07-20 00:00:00",
    "accepted_gdpr_at": "2021-04-23 00:00:00",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": true,
    "login": "stefan@softtouch.be",
    "lastlogin": "2023-07-20 00:00:00",
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-03 00:00:00",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "01",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 11:08:36",
    "gets_direct_discount": true,
    "direct_discount_percentage": 10,
    "customer_card_revenue": 100,
    "customer_card_percentage": 5,
    "customer_card_discount": 5,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

##### POST Customers/bulk_update
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/bulk_update`
Updates up to 500 customers in one call. Each entry of the `customers` array has a `key` (the customer number) and the fields to change, as in PATCH.

When to use it: to write back mailing preferences or corrected addresses from a mailing tool or CRM.

 | 

 | name
 | type
 | 

 | customers
 | array
 | required, max. 500 entries

 | customers[].key
 | integer
 | required, the customer number

 | customers[]. …
 | 
 | any field of the PATCH call

The response is the list of updated customers.
Request body:
```
{
    "customers": [
        {
            "id": 5,
            "salutation_id": "9001",
            "firstname": "Bert",
            "name": "Van de Vyver",
            "company": "SoftTouch BV",
            "address": "Ambachtenlaan 6A",
            "zip": "9080",
            "city": "Lochristi",
            "country": "BE",
            "telephone": "",
            "mobile": "",
            "email": "bert.vdv@softtouch.be",
            "email2": "bert.vandevyver@softtouch.be",
            "birthday": "1995/09/21",
            "vatid": "",
            "firstvisit": "2021/04/23",
            "lastvisit": "2021/04/23",
            "accepted_gdpr_at": "2021/04/23",
            "faultysms": false,
            "sendsms": true,
            "faultyemail": false,
            "sendemail": true,
            "faultyemail2": false,
            "sendemail2": true,
            "faultymail": false,
            "sendmail": true,
            "send_eticket": true,
            "active": true,
            "login": "bert.vandevyver@softtouch.be",
            "password": "1234pass",
            "lastlogin": "2021/04/23",
            "category1": "0100",
            "category2": "0200",
            "category3": "0300",
            "category4": "0400",
            "category5": "0500",
            "category6": "0600",
            "category7": "0700",
            "category8": "0800",
            "category9": "0900",
            "category10": "1000",
            "miscellaneous": "",
            "pos_id": "0101",
            "store_id": "01"
        },
        {
            "id": 2,
            "salutation_id": "9001",
            "firstname": "Stefan",
            "name": "de Bakker",
            "company": "SoftTouch Vlaanderen BV",
            "address": "Ambachtenlaan 6A",
            "zip": "9080",
            "city": "Lochristi",
            "country": "BE",
            "telephone": "09/219.00.83",
            "mobile": "",
            "email": "stefan@softtouch.be",
            "email2": "dev@softtouch.be",
            "birthday": "1989/05/27",
            "vatid": "",
            "firstvisit": "2016/01/13",
            "lastvisit": "2023/07/20",
            "accepted_gdpr_at": "2021/04/23",
            "faultysms": false,
            "sendsms": true,
            "faultyemail": false,
            "sendemail": true,
            "faultyemail2": false,
            "sendemail2": true,
            "faultymail": false,
            "sendmail": true,
            "send_eticket": true,
            "active": true,
            "login": "stefan@softtouch.be",
            "password": "pass1234",
            "lastlogin": "2023/07/20",
            "category1": "0100",
            "category2": "0200",
            "category3": "0300",
            "category4": "0400",
            "category5": "0500",
            "category6": "0600",
            "category7": "0700",
            "category8": "0800",
            "category9": "0900",
            "category10": "1000",
            "miscellaneous": "",
            "pos_id": "0101",
            "store_id": "01"
        }
    ]
}
```
Example response `Customers/bulk_update` (200):
```json
true
```

##### PATCH Customers
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2`
Updates a customer. Only the parameters that are sent are changed.

When to use it: when the customer edits the profile in the web shop, adds a login to an existing customer record (see the login flow in the folder description), or accepts the privacy policy.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | salutation_id
 | string
 | length 4, a customer category of the salutation group

 | company
 | string
 | 

 | address, zip, city
 | string
 | at least an address is expected

 | country
 | string
 | ISO code, length 2

 | telephone, mobile
 | string
 | 

 | email, email2
 | string
 | valid e-mail addresses

 | birthday
 | date
 | YYYY-MM-DD

 | vatid
 | string
 | 

 | firstvisit, lastvisit
 | date
 | 

 | accepted_gdpr_at
 | date or null
 | when the customer accepted the privacy policy

 | faultysms, sendsms, faultyemail, sendemail, faultyemail2, sendemail2, faultymail, sendmail, send_eticket
 | boolean
 | mailing preferences and validity flags

 | active
 | boolean
 | default true

 | login
 | string
 | web shop login, required together with password; must be unique

 | password
 | string
 | required together with login; hashed and stored by the API, never returned

 | lastlogin
 | date
 | 

 | category1 … category10
 | string
 | length 4, see Customer categories

 | miscellaneous
 | string
 | free text

 | pos_id
 | string
 | length 4, where the customer is created

 | store_id
 | string
 | length 2

 | is_b2b
 | boolean
 | business customer, default false

The response is the updated customer with `display=full` fields.
Request body:
```
{
    "salutation_id": "9001",
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "SoftTouch BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "dev@softtouch.be",
    "email2": "",
    "birthday": "1989/05/27",
    "vatid": "",
    "firstvisit": "2016/01/11",
    "lastvisit": "2023/07/20",
    "accepted_gdpr_at": "2021/04/23",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultyemail2": false,
    "sendemail2": true,
    "faultymail": false,
    "sendmail": true,
    "send_eticket": true,
    "active": true,
    "login": "stefan@softtouch.be",
    "password": "pass1234",
    "lastlogin": "2023/07/20",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "pos_id": "0101",
    "store_id": "01"
}
```
Example response `Customers` (200):
```json
{
    "key": 2,
    "firstname": "Stefan",
    "name": "de Bakker",
    "company": "SoftTouch BV",
    "address": "Ambachtenlaan 6A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "email": "dev@softtouch.be",
    "birthday": "1989/05/27",
    "vatid": "",
    "firstvisit": "2016/01/11",
    "lastvisit": "2023/07/20",
    "accepted_gdpr_at": "2021-04-23 00:00:00",
    "faultysms": false,
    "sendsms": true,
    "faultyemail": false,
    "sendemail": true,
    "faultymail": false,
    "sendmail": true,
    "active": true,
    "login": "stefan@softtouch.be",
    "lastlogin": "2023/07/20",
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-03 00:00:00",
    "modifiedby": "1001",
    "pos_id": "0101",
    "store_id": "01",
    "salutation_id": "9001",
    "category1": "0100",
    "category2": "0200",
    "category3": "0300",
    "category4": "0400",
    "category5": "0500",
    "category6": "0600",
    "category7": "0700",
    "category8": "0800",
    "category9": "0900",
    "category10": "1000",
    "miscellaneous": "",
    "timestamp": "2023-07-03 11:15:18",
    "gets_direct_discount": true,
    "direct_discount_percentage": 10,
    "customer_card_revenue": 743,
    "customer_card_percentage": 5,
    "customer_card_discount": 37.15,
    "customer_card_lines": 0,
    "customer_card_points": 0,
    "cards": [],
    "is_b2b": false
}
```

### V1 / Customer categories
#### Introduction

Customer categories classify customers in up to ten groups: the language, the sex, the salutation, a customer segment, the source of the customer, anything with a limited number of values. They work like the product categories: the key starts with the group, the description should be short, and only active categories can be assigned. The meaning of each group is defined by the client.

A customer refers to its categories in `category1` to `category10` and, for the salutation, in `salutation_id`.

##### GET Customer_categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_categories`
Lists the customer categories. Like every list call, the result is limited to 500 records per call.

When to use it: to fill the language, salutation or segment selectors of a registration form with the values the client uses, and to translate the codes of a customer record.

 | 

 | name
 | type
 | 

 | group
 | string
 | one group: 01 … 05 or 90

 | active
 | boolean
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (4 characters); the first two are the group

- group: the group

- description, description2 … description5: the description, and the description per language

- colourcode: a colour used in FasMan screens

- active: whether the category can be assigned to customers
Example response `Customer_categories` (200):
```json
[
    {
        "key": "9001",
        "group": "90",
        "description": "Dhr.",
        "description2": "",
        "description3": "",
        "description4": "",
        "description5": "",
        "colourcode": "",
        "active": true
    },
    {
        "key": "9002",
        "group": "90",
        "description": "Mevr.",
        "description2": "",
        "description3": "",
        "description4": "",
        "description5": "",
        "colourcode": "",
        "active": true
    }
]
```

##### POST Customer_categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_categories`
Creates a customer category. The key is assigned by FasMan.

When to use it: only in agreement with the client, for example when a CRM introduces a customer segment that FasMan should know.

 | 

 | name
 | type
 | 

 | group
 | string
 | required, 01 … 05

 | description
 | string
 | required

 | active
 | boolean
 | default true

The response is the created category.
Request body:
```
{
    "group": "01",
    "description": "Nederlands",
    "active": true
}
```
Example response `Customer_categories` (200):
```json
{
    "key": "0101",
    "group": "01",
    "description": "Nederlands",
    "description2": "",
    "description3": "",
    "description4": "",
    "description5": "",
    "colourcode": null,
    "active": true
}
```

### V1 / Customer family
#### Introduction

A customer can have family members: a mother as the main customer and her children as family members, for example. FasMan uses them for birthday actions and gift lists. The fields are free (texts, statuses and dates) and their meaning is agreed with the client.

This function is rarely used; discuss it with the client before you implement it.

##### GET Customers/{{customerId}}/family
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/family`
Lists the family members of a customer.

When to use it: when the web shop lets a customer manage the people they buy for (children's sizes, birthdays), or for birthday mailings.

 | 

 | name
 | type
 | 

 | customerId
 | integer
 | required, in the URL

 | date_1, date_2, date_3
 | date
 | members with this date

 | date_1_period, date_2_period, date_3_period
 | string
 | two dates separated by a comma

 | date_1_birthdays, date_2_birthdays, date_3_birthdays
 | string
 | two dates separated by a comma; matches day and month only

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier of the family member

- customer: the customer number of the main customer

- text1 … text5: free fields, usually the name of the family member in text1

- email: e-mail address

- status1 … status3: free status fields

- date1 … date3: free dates, usually the date of birth in date1

- active: whether the family member can be used
Example response `Customers/{{customerId}}/family` (200):
```json
[
    {
        "key": 1,
        "customer": 2,
        "text1": "Child 1",
        "text2": "",
        "text3": "",
        "text4": "",
        "text5": "",
        "email": "",
        "status1": "",
        "status2": "",
        "status3": "",
        "date1": "2016-01-01",
        "date2": "0000-00-00",
        "date3": "0000-00-00",
        "active": true
    },
    {
        "key": 2,
        "customer": 2,
        "text1": "Child 2",
        "text2": "",
        "text3": "",
        "text4": "",
        "text5": "",
        "email": "",
        "status1": "",
        "status2": "",
        "status3": "",
        "date1": "2020-01-13",
        "date2": "0000-00-00",
        "date3": "0000-00-00",
        "active": true
    }
]
```

##### GET Customers/{{customerId}}/family/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/family/1`
Fetches one family member of a customer. The return values are the same as in the list call.

When to use it: to re-read one family member before updating it.

 | 

 | name
 | type
 | 

 | customerId
 | integer
 | required, in the URL

 | id
 | integer
 | required, in the URL
Example response `Customers/{{customerId}}/family/{{id}}` (200):
```json
{
    "key": 1,
    "customer": 2,
    "text1": "Emma",
    "text2": "",
    "text3": "",
    "text4": "",
    "text5": "",
    "email": "",
    "status1": "",
    "status2": "",
    "status3": "",
    "date1": "2019-04-12",
    "date2": null,
    "date3": null,
    "active": true
}
```

##### POST Customers/{{customerId}}/family
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/family`
Creates a family member for a customer.

When to use it: when the customer adds a family member in the web shop.

 | 

 | name
 | type
 | 

 | customerId
 | integer
 | required, in the URL

 | text1 … text5
 | string
 | free fields, usually the name in text1

 | email
 | string
 | 

 | status1 … status3
 | string
 | free status fields

 | date1 … date3
 | date
 | free dates, usually the date of birth in date1

 | active
 | boolean
 | default true

The response is the created family member.
Request body:
```
{
    "text1": "Emma",
    "date1": "2019-04-12",
    "active": true
}
```
Example response `Customers/{{customerId}}/family` (200):
```json
{
    "key": 3,
    "customer": 2,
    "text1": "Emma",
    "text2": "",
    "text3": "",
    "text4": "",
    "text5": "",
    "email": "",
    "status1": "",
    "status2": "",
    "status3": "",
    "date1": "2019-04-12",
    "date2": null,
    "date3": null,
    "active": true
}
```

##### PATCH Customers/{{customerId}}/family
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/family/1`
Updates a family member. Only the parameters that are sent are changed; the fields are the same as in the POST call.

When to use it: when the customer edits a family member.

 | 

 | name
 | type
 | 

 | customerId
 | integer
 | required, in the URL

 | id
 | integer
 | required, in the URL

The response is the updated family member.
Request body:
```
{
    "email": "emma@example.com"
}
```
Example response `Customers/{{customerId}}/family` (200):
```json
{
    "key": 1,
    "customer": 2,
    "text1": "Emma",
    "text2": "",
    "text3": "",
    "text4": "",
    "text5": "",
    "email": "emma@example.com",
    "status1": "",
    "status2": "",
    "status3": "",
    "date1": "2019-04-12",
    "date2": null,
    "date3": null,
    "active": true
}
```

##### DELETE Customers/{{customerId}}/family
`https://api.softtouch.eu/1/accounts/{{accountId}}/customers/2/family/1`
Deletes a family member. The response is `true`.

When to use it: when the customer removes a family member.

 | 

 | name
 | type
 | 

 | customerId
 | integer
 | required, in the URL

 | id
 | integer
 | required, in the URL
Example response `Customers/{{customerId}}/family` (200):
```json
true
```

### V1 / Customer order statuses
#### Introduction

A customer order status tells the shop where a single sold or reserved item stands in its fulfilment: does it still have to be picked up, is it waiting for a transfer from another store, has it been shipped? FasMan shows these statuses in its customer order overview so the sales people can follow up a web shop order without opening the web shop.

A status is always linked to one line of one of these documents:

 | 

 | Document
 | Parameters
 | Typical origin

 | Receipt
 | `receipt_id` + `receipt_line`
 | a paid web shop order

 | Reservation
 | `reservation_id` + `reservation_line`
 | an unpaid or picked-up-in-store order

 | Transfer request
 | `transfer_request_item_id`
 | an item that has to come from another store

 | Transfer
 | `transfer_item_id`
 | an item that is on its way between stores

The same status can hold more than one link: when a receipt line is fulfilled through a transfer request, the status carries both the receipt line and the transfer request item.

#### Type and status codes

Both `type_id` and `status_id` are five-character codes from the FasMan code table. The most common values:

 | 

 | type_id
 | Meaning

 | 31000
 | To pick up in the store

 | 31001
 | To despatch (send to the customer)

 | 

 | status_id
 | Meaning

 | 31100
 | To confirm

 | 31101
 | Present (in stock in the end point store)

 | 31102
 | To order (at the supplier)

 | 31103
 | In order

 | 31104
 | To transfer (from another store)

 | 31105
 | In transfer request

 | 31106
 | In transfer

 | 31107
 | Not available

 | 31108
 | Processed (handed over or shipped)

 | 31109
 | Deleted

The `end_point_warehouse_id` is the store where the item has to end up, for example the store where the customer will pick it up. Stores are identified by their two-character id (see the Stores endpoint).

Statuses the store changes in FasMan are not pushed to the web shop: poll the list call, or use the confirmation URLs described in Receipts, Web shop orders, to be notified when an order is ready.

This endpoint requires FasMan database version 295 or higher.

In version 2, Customer_orders / Customer_order_status_board returns these statuses joined with the receipt or reservation line and the customer, and Reservation_headers and Receipt_headers return them per line.

##### GET Customer_order_statuses
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_order_statuses`
Lists customer order statuses. Without filters every status is returned; the filters narrow the result down to one document or one store. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Use it to show the customer the state of an order in the web shop's my orders page, or to poll for orders the store has marked as handled (status 31108). Filter on `receipt_id` or `reservation_id` to get the lines of one order, or on `end_point_warehouse_id` to build a pick list for one store.

 | 

 | name
 | type
 | 

 | receipt_id
 | integer
 | 10 digits, required together with receipt_line

 | receipt_line
 | integer
 | line number on the receipt, 1 – 65535

 | reservation_id
 | integer
 | 9 digits (999100000 – 999199999), required together with reservation_line

 | reservation_line
 | integer
 | line number on the reservation, 1 – 65535

 | transfer_request_item_id
 | integer
 | id of a transfer request item

 | transfer_item_id
 | integer
 | id of a transfer item

 | end_point_warehouse_id
 | string
 | store id, length 2

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the status

- receipt_id, receipt_line: the receipt line this status belongs to, null when not linked

- reservation_id, reservation_line: the reservation line this status belongs to, null when not linked

- transfer_request_id, transfer_request_item_id: the transfer request (item) this status belongs to

- transfer_id, transfer_item_id: the transfer (item) this status belongs to

- type_id: fulfilment type, e.g. 31000 (to pick up) or 31001 (to despatch)

- status_id: current status, see the folder description for the list of codes

- end_point_warehouse_id: the store where the item has to end up

- user_create, user_modify: the FasMan user that created and last changed the status

- created_at, updated_at, deleted_at: timestamps
Example response `Customer_order_statuses` (200):
```json
[
    {
        "id": 132,
        "receipt_id": 1000242898,
        "receipt_line": 1,
        "reservation_id": null,
        "reservation_line": null,
        "transfer_request_id": 148,
        "transfer_request_item_id": 189,
        "transfer_id": null,
        "transfer_item_id": null,
        "type_id": "31000",
        "status_id": "31105",
        "end_point_warehouse_id": "01",
        "user_create": "1001",
        "user_modify": "1001",
        "deleted_at": null,
        "created_at": "2026-07-23 15:09:44",
        "updated_at": "2026-07-23 15:09:44"
    },
    {
        "id": 133,
        "receipt_id": 1000242880,
        "receipt_line": 3,
        "reservation_id": null,
        "reservation_line": null,
        "transfer_request_id": null,
        "transfer_request_item_id": null,
        "transfer_id": null,
        "transfer_item_id": null,
        "type_id": "31001",
        "status_id": "31101",
        "end_point_warehouse_id": "01",
        "user_create": "1001",
        "user_modify": "1001",
        "deleted_at": null,
        "created_at": "2026-07-29 13:04:46",
        "updated_at": "2026-07-29 13:04:46"
    }
]
```

##### GET Customer_order_statuses/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_order_statuses/1`
Fetches one customer order status by its id. The return values are the same as in the list call.

When to use it: Use it to re-read one status line, for example to check whether the store changed a line you created.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, the id of the status

A `400` error with the message Customer Order Status model {id} not found is returned when the id does not exist.
Example response `Customer_order_statuses/{{id}}` (200):
```json
{
    "id": 132,
    "receipt_id": 1000242898,
    "receipt_line": 1,
    "reservation_id": null,
    "reservation_line": null,
    "transfer_request_id": 148,
    "transfer_request_item_id": 189,
    "transfer_id": null,
    "transfer_item_id": null,
    "type_id": "31000",
    "status_id": "31105",
    "end_point_warehouse_id": "01",
    "user_create": "1001",
    "user_modify": "1001",
    "deleted_at": null,
    "created_at": "2026-07-23 15:09:44",
    "updated_at": "2026-07-23 15:09:44"
}
```

##### POST Customer_order_statuses
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_order_statuses`
Creates a customer order status for one document line. At least one link (receipt, reservation, transfer request item or transfer item) should be given; the API validates that the linked line exists and that it has no status yet.

When to use it: Use it right after you created a web shop order as a receipt or reservation, once per line, so the store sees the order in its order overview in FasMan and knows whether the customer picks it up (31000) or wants it shipped (31001). When you create the receipt with `is_webshop_order: true` FasMan creates the statuses itself; then you only need this call for extra lines.

 | 

 | name
 | type
 | 

 | receipt_id
 | integer
 | 10 digits

 | receipt_line
 | integer
 | required with receipt_id, 1 – 65535

 | reservation_id
 | integer
 | 999100000 – 999199999

 | reservation_line
 | integer
 | required with reservation_id, 1 – 65535

 | transfer_request_item_id
 | integer
 | 

 | transfer_item_id
 | integer
 | 

 | type_id
 | string
 | required, length 5, e.g. 31000 (to pick up) or 31001 (to despatch)

 | status_id
 | string
 | required, length 5, see the folder description

 | end_point_warehouse_id
 | string
 | store id, length 2

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user of the account

Only the links that are set in the input are stored; the others stay null. The response is the created status, with the same fields as the list call.
Request body:
```
{
    "receipt_id": 1234567890,
    "receipt_line": 1,
    "type_id": "31001",
    "status_id": "31100",
    "end_point_warehouse_id": "01",
    "user_id": "1001"
}
```
Example response `Customer_order_statuses` (200):
```json
{
    "id": 135,
    "receipt_id": 1234567890,
    "receipt_line": 1,
    "reservation_id": null,
    "reservation_line": null,
    "transfer_request_id": null,
    "transfer_request_item_id": null,
    "transfer_id": null,
    "transfer_item_id": null,
    "type_id": "31001",
    "status_id": "31100",
    "end_point_warehouse_id": "01",
    "user_create": "1001",
    "user_modify": "1001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:12:03",
    "updated_at": "2026-09-14 10:12:03"
}
```

##### PATCH Customer_order_statuses/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_order_statuses/1`
Updates an existing customer order status. This is the call a web shop uses to move an order line to its next status, for example from to confirm (31100) to processed (31108) when the parcel has been handed to the carrier. Only the parameters that are sent are changed.

When to use it: Use it when something happens on the web shop side that the store should see: the parcel was shipped (set 31108), the customer cancelled the line (31109), or the customer changed from shipping to pick up (change `type_id` and `end_point_warehouse_id`). Statuses the store changes in FasMan are picked up by polling the list call, or through the confirmation URLs (see Receipts, Web shop orders).

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | receipt_id, receipt_line
 | integer
 | re-link the status to another receipt line

 | reservation_id, reservation_line
 | integer
 | re-link the status to another reservation line

 | transfer_request_item_id
 | integer
 | 

 | transfer_item_id
 | integer
 | 

 | type_id
 | string
 | length 5

 | status_id
 | string
 | length 5

 | end_point_warehouse_id
 | string
 | store id, length 2

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

The response is the updated status.
Request body:
```
{
    "status_id": "31108",
    "user_id": "1001"
}
```
Example response `Customer_order_statuses/{{id}}` (200):
```json
{
    "id": 135,
    "receipt_id": 1234567890,
    "receipt_line": 1,
    "reservation_id": null,
    "reservation_line": null,
    "transfer_request_id": null,
    "transfer_request_item_id": null,
    "transfer_id": null,
    "transfer_item_id": null,
    "type_id": "31001",
    "status_id": "31108",
    "end_point_warehouse_id": "01",
    "user_create": "1001",
    "user_modify": "1001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:12:03",
    "updated_at": "2026-09-14 16:40:51"
}
```

### V1 / Customer memos
#### Introduction

A customer memo is a free text FasMan shows to the sales person when the customer is selected at the point of sale: "prefers to be called Mrs Janssens", "always asks for an invoice", "returns a lot". One memo per customer.

##### GET Customer_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_memos`
Lists customer memos. Like every list call, the result is limited to 500 records per call.

When to use it: to show the store's remarks about a customer in a customer service tool, or to synchronise them to a CRM. Web shops that only sell do not need it.

 | 

 | name
 | type
 | 

 | customer_id
 | integer
 | the memo of one customer

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- customer_id: the customer number

- memo: the text
Example response `Customer_memos` (200):
```json
[
    {
        "customer_id": 19,
        "memo": "Prefers to be called Mrs Janssens"
    },
    {
        "customer_id": 25,
        "memo": "Always asks for an invoice"
    }
]
```

##### GET Customer_memos/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_memos/{{id}}`
Fetches the memo of one customer; the id is the customer number.

When to use it: to show the remark of one customer, for example on a customer service screen.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, the customer number
Example response `Customer_memos/{{id}}` (200):
```json
{
    "customer_id": 19,
    "memo": "Prefers to be called Mrs Janssens"
}
```

##### POST Customer_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_memos`
Creates the memo of a customer.

When to use it: from a CRM or customer service tool that keeps remarks the stores should see.

 | 

 | name
 | type
 | 

 | customer_id
 | integer
 | required

 | memo
 | string
 | required

The response is the created memo.
Request body:
```
{
    "customer_id": 37790,
    "memo": "Memo text"
}
```
Example response `Customer_memos` (200):
```json
{
    "customer_id": 19,
    "memo": "Prefers to be called Mrs Janssens"
}
```

##### PATCH Customer_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_memos/2`
Replaces the memo of a customer; the id in the URL is the customer number.

When to use it: to update the remark from the CRM.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the customer number

 | memo
 | string
 | required

The response is the updated memo.
Request body:
```
{
    "memo": "Memo text new"
}
```
Example response `Customer_memos` (200):
```json
{
    "customer_id": 2,
    "memo": "Updated memo"
}
```

##### DELETE Customer_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/customer_memos/2`
Deletes the memo of a customer; the id in the URL is the customer number. The response is `true`.

When to use it: when the remark no longer applies.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the customer number
Example response `Customer_memos` (200):
```json
true
```

### V1 / Delivery addresses
#### Introduction

A delivery address is an address of a customer that differs from the customer's own address: the office, a relative, a holiday address. A customer can have any number of them. A reservation or receipt that has to be shipped refers to one with `delivery_address_id`; FasMan prints it on the shipping documents and uses it for the shipping label integrations.

For pick-up points, `pickup_id` and `pickup_type` hold the identifier and provider of the pick-up point (see the shipping integrations of the client).

##### GET Deliveryaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/deliveryaddresses`
Lists delivery addresses. Like every list call, the result is limited to 500 records per call; filter on the customer.

When to use it: at checkout, to let a logged-in customer pick one of the saved delivery addresses.

 | 

 | name
 | type
 | 

 | customer_ids
 | string
 | comma separated customer numbers

 | id
 | integer
 | one address

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier, used as `delivery_address_id`

- customer: the customer number

- name, surname: last and first name (or company and contact)

- address, address2, zip, city, country: the address; country is the ISO code

- telephone, mobile, fax, email: contact details for the delivery

- remarks: delivery instructions

- vatid: VAT number when the delivery is for a company

- created, createdby, modified, modifiedby: audit fields
Example response `Deliveryaddresses` (200):
```json
[
    {
        "key": 1,
        "customer": 2,
        "name": "Stefan",
        "surname": "de Bakker",
        "address": "Ambachtenlaan 6A",
        "address2": "",
        "zip": "9080",
        "city": "Lochristi",
        "country": "BE",
        "telephone": "092190083",
        "mobile": "",
        "fax": "",
        "email": "test@softtouch.be",
        "remarks": "",
        "vatid": "0",
        "created": "2023-07-19",
        "createdby": "1001",
        "modified": "2023-07-19",
        "modifiedby": "1001"
    }
]
```

##### GET Deliveryaddresses/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/deliveryaddresses/1`
Fetches one delivery address. The return values are the same as in the list call.

When to use it: to show the delivery address of an order, from the `delivery_address_id` of a reservation or receipt.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `Deliveryaddresses/{{id}}` (200):
```json
{
    "key": 1,
    "customer": 2,
    "name": "Stefan",
    "surname": "de Bakker",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "092190083",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "0",
    "created": "2023-07-19",
    "createdby": "1001",
    "modified": "2023-07-19",
    "modifiedby": "1001"
}
```

##### POST Deliveryaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/deliveryaddresses`
Creates a delivery address for a customer.

When to use it: at checkout, when the customer enters a new shipping address; store it so it can be reused and referred to in the reservation or receipt.

 | 

 | name
 | type
 | 

 | customer
 | integer
 | required, the customer number

 | name
 | string
 | last name or company name

 | surname
 | string
 | first name or contact name

 | address, address2
 | string
 | street and number, and an extra address line

 | zip, city
 | string
 | 

 | country
 | string
 | ISO code, length 2

 | telephone, mobile, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | remarks
 | string
 | delivery instructions

 | vatid
 | string
 | VAT number, when the delivery is for a company

 | pickup_id
 | string
 | identifier of a pick-up point

 | pickup_type
 | string
 | provider of the pick-up point

The response is the created address; use its key as `delivery_address_id`.
Request body:
```
{
    "customer": 2,
    "name": "Stefan",
    "surname": "de Bakker",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "092190083",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "0"
}
```
Example response `Deliveryaddresses` (200):
```json
{
    "key": 1,
    "customer": 2,
    "name": "Stefan",
    "surname": "de Bakker",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "telephone": "092190083",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "0",
    "created": "2023-07-19 00:00:00",
    "createdby": "1001",
    "modified": "2023-07-19 00:00:00",
    "modifiedby": "1001"
}
```

##### PATCH Deliveryaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/deliveryaddresses/1`
Updates a delivery address. Only the parameters that are sent are changed.

When to use it: when the customer edits a saved delivery address in the web shop.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | surname
 | string
 | first name or contact name

 | address, address2
 | string
 | street and number, and an extra address line

 | zip, city
 | string
 | 

 | country
 | string
 | ISO code, length 2

 | telephone, mobile, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | remarks
 | string
 | delivery instructions

 | vatid
 | string
 | VAT number, when the delivery is for a company

 | pickup_id
 | string
 | 

 | pickup_type
 | string
 | 

The response is the updated address.
Request body:
```
{
    "customer": 2,
    "name": "Stefan",
    "surname": "de Bakker",
    "address": "Ambachtenlaan 6a",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "stefan@softtouch.be",
    "remarks": "If not home, package can be delivered at the door.",
    "vatid": ""
}
```
Example response `Deliveryaddresses` (200):
```json
{
    "key": 1,
    "customer": 2,
    "name": "Stefan",
    "surname": "de Bakker",
    "address": "Ambachtenlaan 6a",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "stefan@softtouch.be",
    "remarks": "If not home, package can be delivered at the door.",
    "vatid": "",
    "created": "2023-07-19",
    "createdby": "1001",
    "modified": "2023-07-19 00:00:00",
    "modifiedby": "1001"
}
```

##### DELETE Deliveryaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/deliveryaddresses/1`
Deletes a delivery address. The response is `true`. Addresses that are referred to by past orders can still be deleted; the orders keep their copy of the address.

When to use it: when the customer removes a saved delivery address.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Deliveryaddresses` (200):
```json
true
```

### V1 / Discount types
#### Introduction

A discount type explains why a discount was given: end-of-season sale, damaged article, staff discount, price match, a supplier promotion. FasMan reports on them and they decide whether a discounted article still counts for the customer card. Discount types are identified by a 14-digit key starting with `99999908`, and they are configured per client.

Reservation and receipt items carry the discount type in `discount_type_id`. When you give a discount for a reason the client tracks, send the matching type; when you send none, the API sets a default where applicable. The sale periods of Stock sale v2 refer to a discount type too.

##### GET Discount_types
`https://api.softtouch.eu/1/accounts/{{accountId}}/discount_types`
Lists the discount types of the client. Like every list call, the result is limited to 500 records per call.

When to use it: once, when you set up the receipt or reservation integration, to agree with the client which type to send with which discount; then cache the list.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (14 digits, starting with 99999908), used as discount_type_id

- description: the description of the discount type

- supplier_reference: the reference of the supplier that funds the discount, when applicable

- free: the discount type makes the article free

- store_id: the store the type is limited to, empty for all stores

- on_customer_card: articles with this discount type still count for the customer card

- discount_on_customer_card: the discount itself is taken into account for the customer card

- status: A (active) or I (inactive)
Example response `Discount_types` (200):
```json
[
    {
        "key": 99999908000001,
        "description": "Seasonal sale",
        "supplier_reference": "",
        "free": false,
        "store_id": "",
        "on_customer_card": false,
        "discount_on_customer_card": false,
        "status": "A"
    },
    {
        "key": 99999908000002,
        "description": "Damaged article",
        "supplier_reference": "",
        "free": false,
        "store_id": "",
        "on_customer_card": true,
        "discount_on_customer_card": false,
        "status": "A"
    }
]
```

### V1 / File and text presets
#### Introduction

Presets are the types of the files and texts attached to a product (the `files` and `texts` arrays of the product, and the Article_texts resource of V2). A file preset says what kind of file it is: the main photo, an extra photo, a size chart. A text preset says what kind of text: the title, the description, the composition, a SEO text.

The presets are defined per client, with one exception: text presets whose id starts with S are fixed SoftTouch types, used by the supplier connections (S1 to S3 composition per language, SJ to SO short and long descriptions per language, SA to SC SEO texts). Agree the other ids with the client before you rely on them.

##### GET FilePresets
`https://api.softtouch.eu/1/accounts/{{accountId}}/file_presets`
Lists the file presets. Like every list call, the result is limited to 500 records per call.

When to use it: once, to know which file type of a product is the main photo, the extra photos and so on. Cache the list.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier (2 characters), used as `type` in the files of a product

- description: the description of the file type
Example response `FilePresets` (200):
```json
[
    {
        "id": "01",
        "description": "Hoofd"
    },
    {
        "id": "02",
        "description": "Extra"
    }
]
```

##### GET FilePresets/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/file_presets/01`
Fetches one file preset by its id.

When to use it: when a product file refers to a type you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 2
Example response `FilePresets/{{id}}` (200):
```json
{
    "id": "01",
    "description": "Hoofd"
}
```

##### GET TextPresets
`https://api.softtouch.eu/1/accounts/{{accountId}}/text_presets`
Lists the text presets. Like every list call, the result is limited to 500 records per call.

When to use it: once, to know which text type of a product holds the title, the description, the composition and the SEO texts, and to know which types exist before creating texts. Cache the list.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier (2 characters), used as `type` in the texts of a product; ids starting with S are fixed SoftTouch types

- description: the description of the text type
Example response `TextPresets` (200):
```json
[
    {
        "id": "S1",
        "description": "Composition dutch"
    },
    {
        "id": "S2",
        "description": "Composition french"
    },
    {
        "id": "S3",
        "description": "Composition english"
    },
    {
        "id": "SA",
        "description": "SEO dutch"
    },
    {
        "id": "SB",
        "description": "SEO french"
    },
    {
        "id": "SC",
        "description": "SEO english"
    },
    {
        "id": "S5",
        "description": "Wash Instructions"
    },
    {
        "id": "S6",
        "description": "Bleach Instructions"
    },
    {
        "id": "S7",
        "description": "Dry Instructions"
    },
    {
        "id": "S8",
        "description": "Iron Instructions"
    },
    {
        "id": "S9",
        "description": "DryClean Instructions"
    },
    {
        "id": "SJ",
        "description": "Long Description dutch"
    },
    {
        "id": "SK",
        "description": "Long Description french"
    },
    {
        "id": "SL",
        "description": "Long Description english"
    },
    {
        "id": "SM",
        "description": "Short Description dutch"
    },
    {
        "id": "SN",
        "description": "Short Description french"
    },
    {
        "id": "SO",
        "description": "Short Description english"
    }
]
```

##### GET TextPresets/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/text_presets/S1`
Fetches one text preset by its id.

When to use it: when a product text refers to a type you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 2
Example response `TextPresets/{{id}}` (200):
```json
{
    "id": "S1",
    "description": "Composition dutch"
}
```

### V1 / Gift lists
#### Introduction

A gift list (birth list, wedding list) is a list of articles a customer would like to receive. Friends and family buy gifts from the list, in the store or in the web shop; FasMan keeps track of what is still open, reserved and sold, who bought what, and where the gift is (in the store, with the buyer, with the list owner).

A gift list has a header (the parents, the baby, dates, status, an optional web login) and gifts (one per article, with a status, a stock status, prices and the buyer once it is sold). Version 2 exposes the same data as Gift_list_headers and Gift_list_items, with `select` to load them together; use V2 for reading and the V1 calls below for creating and updating.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

#### Statuses

 | 

 | Gift list status
 | Meaning

 | 01000
 | Open

 | 01001
 | Inactive

 | 01002
 | Active

 | 01003
 | Closed

 | 

 | Gift status
 | Meaning

 | 01500
 | Open

 | 01501
 | Reserved (bought on a reservation)

 | 01502
 | Sold (bought on a receipt)

 | 

 | Stock status
 | Meaning

 | 01800
 | Open

 | 01801
 | Ordered

 | 01802
 | In stock

 | 

 | Pick-up by
 | Meaning

 | 01600
 | The gifter

 | 01601
 | The list owner

 | 

 | Location
 | Meaning

 | 01700
 | In the store

 | 01701
 | With the gifter

 | 01702
 | With the list owner

##### GET Giftlists - DEPRECATED
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists`
Deprecated. Use Gift_list_headers in API version 2, which returns the same data with `select` to include the gifts, the store and the customer.

When to use it: not for new integrations.
Example response `Giftlists - DEPRECATED` (200):
```json
[
    {
        "key": 1,
        "customer": 4,
        "surname": "Doe",
        "address": "Hoofdstraat 123",
        "postcode": "1000",
        "city": "Bruxelles",
        "mother": "Mother name",
        "father": "Father name",
        "baby_name": "Baby name",
        "brothers_sisters": "Sibling names",
        "sex": "Sex of the baby",
        "free_text": "",
        "date1": "2024-10-06",
        "date2": "2024-10-08",
        "date3": "2024-11-30",
        "date4": "2024-10-28",
        "remark": "",
        "status": "01000",
        "value1": 0,
        "value2": 0,
        "value3": 0,
        "created": "2024-10-28",
        "modified": "0000-00-00",
        "online": true,
        "store": "02",
        "webuser": "johndoe_245@fictional.com",
        "webpass": "Twh43*sLK",
        "created_at": "2024-10-28 14:19:39",
        "updated_at": "2024-10-28 14:19:39",
        "gifts": [
            {
                "key": 1,
                "line": "1",
                "product": 10000301030102,
                "buyer_name": "",
                "buyer_id": "",
                "text3": "",
                "text4": "",
                "text5": "",
                "text6": "",
                "text7": "",
                "text8": "",
                "text9": "",
                "product_desc": "Heren Kleding SoftTouch",
                "sales_date": "2024-10-28",
                "date2": "2024-10-28",
                "date3": "2024-10-28",
                "date4": "2024-10-28",
                "remark": "",
                "status": "01500",
                "status2": "",
                "status3": "",
                "total": 19.95,
                "discount": 0,
                "due": 19.95,
                "created": "2024-10-28",
                "modified": "2024-10-28",
                "online": true,
                "location": "01700",
                "mustbuy": false,
                "must_buy": false,
                "ticket": 0,
                "timestamp": "2024-10-28 14:20:49",
                "stockstatus": "01800",
                "pickupby": "",
                "pre_deliver": false
            }
        ]
    }
]
```

##### GET Giftlists/{{id}} - DEPRECATED
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists/1`
Deprecated. Use Gift_list_headers/{{id}} in API version 2.

When to use it: not for new integrations.
Example response `Giftlists/{{id}} - DEPRECATED` (200):
```json
{
    "key": 1,
    "customer": 4,
    "surname": "Doe",
    "address": "Hoofdstraat 123",
    "postcode": "1000",
    "city": "Bruxelles",
    "mother": "Mother name",
    "father": "Father name",
    "baby_name": "Baby name",
    "brothers_sisters": "Sibling names",
    "sex": "Sex of the baby",
    "free_text": "",
    "date1": "2024-10-06",
    "date2": "2024-10-08",
    "date3": "2024-11-30",
    "date4": "2024-10-28",
    "remark": "",
    "status": "01000",
    "value1": 0,
    "value2": 0,
    "value3": 0,
    "created": "2024-10-28",
    "modified": "0000-00-00",
    "online": true,
    "store": "02",
    "webuser": "johndoe_245@fictional.com",
    "webpass": "Twh43*sLK",
    "created_at": "2024-10-28 14:19:39",
    "updated_at": "2024-10-28 14:19:39",
    "gifts": [
        {
            "key": 1,
            "line": "1",
            "product": 10000301030102,
            "buyer_name": "",
            "buyer_id": "",
            "text3": "",
            "text4": "",
            "text5": "",
            "text6": "",
            "text7": "",
            "text8": "",
            "text9": "",
            "product_desc": "Heren Kleding SoftTouch",
            "sales_date": "2024-10-28",
            "date2": "2024-10-28",
            "date3": "2024-10-28",
            "date4": "2024-10-28",
            "remark": "",
            "status": "01500",
            "status2": "",
            "status3": "",
            "total": 19.95,
            "discount": 0,
            "due": 19.95,
            "created": "2024-10-28",
            "modified": "2024-10-28",
            "online": true,
            "location": "01700",
            "mustbuy": false,
            "must_buy": false,
            "ticket": 0,
            "timestamp": "2024-10-28 14:20:49",
            "stockstatus": "01800",
            "pickupby": "",
            "pre_deliver": false
        }
    ]
}
```

##### POST Giftlists
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists`
Creates a gift list.

When to use it: when the parents create their list in the web shop, or when a store creates it for them through a tool other than FasMan.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

 | 

 | name
 | type
 | Description

 | customer
 | integer
 | the customer number of the list owner

 | surname
 | string
 | required; the name of the list

 | address, postcode, city
 | string
 | the address of the parents

 | mother, father
 | string
 | the names of the parents

 | baby_name
 | string
 | the name of the baby

 | brothers_sisters
 | string
 | the names of siblings

 | sex
 | string
 | the sex of the baby

 | free_text
 | string
 | free text

 | date1
 | date
 | expected date of birth

 | date2
 | date
 | actual date of birth

 | date3
 | date
 | the date the list closes

 | date4
 | date
 | extra date

 | remark
 | string
 | 

 | value1, value2, value3
 | numeric
 | not used by default

 | status
 | string
 | required; 01000 open, 01001 inactive, 01002 active, 01003 closed

 | online
 | boolean
 | the list is visible online

 | store
 | string
 | required; the store that manages the list

 | webuser
 | string
 | login to access or manage the list online; required together with webpass

 | webpass
 | string
 | password; required together with webuser. Hash it yourself, the API stores the value as given

`webuser` and `webpass` are free fields: whether they give the parents access to manage their list, or give buyers access to the list, is a choice per project.

The response is the created gift list with its (empty) gifts array.
Request body:
```
{
    "customer": 1,
    "surname": "surname",
    "address": "",
    "postcode": "",
    "city": "",
    "mother": "",
    "father": "",
    "baby_name": "",
    "brothers_sisters": "",
    "sex": "",
    "free_text": "",
    "date1": "2021-08-26",
    "date2": "2021-08-26",
    "date3": "2021-08-26",
    "date4": "2021-08-26",
    "remark": "",
    "status": "01000",
    "value1": 0,
    "value2": 0,
    "value3": 0,
    "online": 1,
    "store": "01",
    "webuser": "gebruiker@softtouch.be",
    "webpass": "THISISTHEPASSWORD"
}
```
Example response `Giftlists` (200):
```json
{
    "key": 2,
    "customer": 1,
    "surname": "surname",
    "address": "",
    "postcode": "",
    "city": "",
    "mother": "",
    "father": "",
    "baby_name": "",
    "brothers_sisters": "",
    "sex": "",
    "free_text": "",
    "date1": "0001-01-01",
    "date2": "0001-01-01",
    "date3": "0001-01-01",
    "date4": "0001-01-01",
    "remark": "",
    "status": "01000",
    "value1": 0,
    "value2": 0,
    "value3": 0,
    "created": "2024-10-31 00:00:00",
    "modified": "2024-10-31 00:00:00",
    "online": true,
    "store": "01",
    "webuser": "user@softtouch.be",
    "webpass": "THISISTHEPASSWORD",
    "created_at": null,
    "updated_at": null,
    "gifts": []
}
```

##### POST Giftlists/validate-webuser
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists/validate-webuser`
Validates the web login of a gift list and returns the list when the credentials match.

When to use it: on the web shop's gift list login page.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

 | 

 | name
 | type
 | 

 | webuser
 | string
 | required

 | webpass
 | string
 | required
Request body:
```
{
    "webuser": "johndoe_245@fictional.com",
    "webpass": "Twh43*sLK"
}
```
Example response `Giftlists/validate-webuser` (200):
```json
{
    "key": 1,
    "customer": 4,
    "surname": "Doe",
    "address": "Hoofdstraat 123",
    "postcode": "1000",
    "city": "Bruxelles",
    "mother": "Mother name",
    "father": "Father name",
    "baby_name": "Baby name",
    "brothers_sisters": "Sibling names",
    "sex": "Sex of the baby",
    "free_text": "",
    "date1": "2024-10-06",
    "date2": "2024-10-08",
    "date3": "2024-11-30",
    "date4": "2024-10-28",
    "remark": "",
    "status": "01000",
    "value1": 0,
    "value2": 0,
    "value3": 0,
    "created": "2024-10-28",
    "modified": "0000-00-00",
    "online": true,
    "store": "02",
    "webuser": "johndoe_245@fictional.com",
    "webpass": "Twh43*sLK",
    "created_at": "2024-10-28 14:19:39",
    "updated_at": "2024-10-28 14:19:39",
    "gifts": [
        {
            "key": 1,
            "line": "1",
            "product": 10000301030102,
            "buyer_name": "",
            "buyer_id": "",
            "text3": "",
            "text4": "",
            "text5": "",
            "text6": "",
            "text7": "",
            "text8": "",
            "text9": "",
            "product_desc": "Heren Kleding SoftTouch",
            "sales_date": "2024-10-28",
            "date2": "2024-10-28",
            "date3": "2024-10-28",
            "date4": "2024-10-28",
            "remark": "",
            "status": "01500",
            "status2": "",
            "status3": "",
            "total": 19.95,
            "discount": 0,
            "due": 19.95,
            "created": "2024-10-28",
            "modified": "2024-10-28",
            "online": true,
            "location": "01700",
            "mustbuy": false,
            "must_buy": false,
            "ticket": 0,
            "timestamp": "2024-10-28 14:20:49",
            "stockstatus": "01800",
            "pickupby": "",
            "pre_deliver": false
        }
    ]
}
```

##### POST Gifts
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists/2/gifts`
Adds a gift (an article) to an existing gift list.

When to use it: when the parents add articles to their list, and when a gift voucher is sold for the list (with status 01501 or 01502).

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

 | 

 | name
 | type
 | Description

 | product
 | integer
 | required; the product key (14 digits) of an article in the store of the gift list

 | product_desc
 | string
 | required; the product description for the gift

 | status
 | string
 | required, length 5; 01500 open by default, 01501 reserved or 01502 sold when a gift voucher is added

 | total
 | numeric
 | required; value before discount

 | discount
 | numeric
 | required

 | due
 | numeric
 | required; value after discount

 | online
 | boolean
 | show the gift online

 | must_buy
 | boolean
 | the gift has to be bought before the list closes

 | buyer_name
 | string
 | the name of the buyer, once sold

 | buyer_id
 | integer
 | the customer number of the buyer, once sold

 | sales_date
 | date
 | the date the gift was bought

 | ticket
 | string
 | the reservation or receipt id the gift was bought on

 | pickupby
 | string
 | length 5; 01600 gifter, 01601 list owner

 | location
 | string
 | length 5; the current location of the gift: 01700 store, 01701 gifter, 01702 list owner

 | stockstatus
 | string
 | length 5; 01800 open, 01801 ordered, 01802 in stock

 | pre_deliver
 | boolean
 | client specific

 | status2, status3
 | string
 | length 5; client specific statuses starting with 013 and 014

 | text3 … text9
 | string
 | free fields

 | date2 … date4
 | date
 | free dates

 | remark
 | string
 | a message from the buyer, for example

Rules of the default behaviour:

- `total`, `discount` and `due` are fixed when the gift is added and do not follow later price changes: when a gift is sold, sell it for its `due`, not for the current price.

- When a gift is sold, set `ticket` (the reservation or receipt id), `buyer_id`, `buyer_name`, `sales_date`, `status` and `pickupby`. Give the buyer the choice between picking up themselves (01600) and leaving it to the list owner (01601) unless the client decides otherwise.

- `location` is the current location of the gift. Default to the store (01700); when a shipping integration ships it, update it accordingly.

The response is the created gift.
Request body:
```
{
    "product": 10000301030101,
    "buyer_name": "",
    "buyer_id": "",
    "text3": "",
    "text4": "",
    "text5": "",
    "text6": "",
    "text7": "",
    "text8": "",
    "text9": "",
    "product_desc": "This is a description.",
    "remark": "",
    "status": "01500",
    "total": 100,
    "discount": 25,
    "due": 75,
    "online": true,
    "location": "01700",
    "mustbuy": false,
    "ticket": "",
    "stockstatus": "01802"
}
```
Example response `Gifts` (200):
```json
{
    "key": 2,
    "line": "1",
    "product": 10000301030101,
    "buyer_name": "",
    "buyer_id": "",
    "text3": "",
    "text4": "",
    "text5": "",
    "text6": "",
    "text7": "",
    "text8": "",
    "text9": "",
    "product_desc": "This is a description.",
    "sales_date": "2024-10-31",
    "date2": "2024-10-31",
    "date3": "2024-10-31",
    "date4": "2024-10-31",
    "remark": "",
    "status": "01500",
    "status2": "",
    "status3": "",
    "total": 100,
    "discount": 25,
    "due": 75,
    "created": "2024-10-31 00:00:00",
    "modified": "2024-10-31 00:00:00",
    "online": true,
    "location": "01700",
    "mustbuy": false,
    "must_buy": false,
    "ticket": 0,
    "timestamp": "2024-10-31 17:26:14",
    "stockstatus": "01802",
    "pickupby": "",
    "pre_deliver": false
}
```

##### PATCH Giftlists
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists/1`
Updates a gift list. The fields are the same as in the POST call; only the parameters that are sent are changed.

When to use it: when the parents edit their list, and to change the status (close the list, for example).

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

The response is the updated gift list.
Request body:
```
{
    "date2": "2024-09-30"
}
```
Example response `Giftlists` (200):
```json
{
    "key": 1,
    "customer": 4,
    "surname": "Doe",
    "address": "Hoofdstraat 123",
    "postcode": "1000",
    "city": "Bruxelles",
    "mother": "Mother name",
    "father": "Father name",
    "baby_name": "Baby name",
    "brothers_sisters": "Sibling names",
    "sex": "Sex of the baby",
    "free_text": "",
    "date1": "2024-10-06",
    "date2": "2024-09-30",
    "date3": "2024-11-30",
    "date4": "2024-10-28",
    "remark": "",
    "status": "01000",
    "value1": 0,
    "value2": 0,
    "value3": 0,
    "created": "2024-10-28",
    "modified": "2024-11-07 00:00:00",
    "online": true,
    "store": "02",
    "webuser": "johndoe_245@fictional.com",
    "webpass": "Twh43*sLK",
    "created_at": "2024-10-28 14:19:39",
    "updated_at": "2024-10-28 14:19:39",
    "gifts": [
        {
            "key": 1,
            "line": "1",
            "product": 10000301030102,
            "buyer_name": "",
            "buyer_id": "",
            "text3": "",
            "text4": "",
            "text5": "",
            "text6": "",
            "text7": "",
            "text8": "",
            "text9": "",
            "product_desc": "Heren Kleding SoftTouch",
            "sales_date": "2024-10-28",
            "date2": "2024-10-28",
            "date3": "2024-10-28",
            "date4": "2024-10-28",
            "remark": "",
            "status": "01500",
            "status2": "",
            "status3": "",
            "total": 19.95,
            "discount": 0,
            "due": 19.95,
            "created": "2024-10-28",
            "modified": "2024-10-28",
            "online": true,
            "location": "01700",
            "mustbuy": false,
            "must_buy": false,
            "ticket": 0,
            "timestamp": "2024-10-28 14:20:49",
            "stockstatus": "01800",
            "pickupby": "",
            "pre_deliver": false
        }
    ]
}
```

##### PATCH Gifts
`https://api.softtouch.eu/1/accounts/{{accountId}}/giftlists/2/gifts/2`
Updates a gift on a gift list. The fields are the same as in the POST call for gifts; only the parameters that are sent are changed.

When to use it: mostly after a gift was bought. Update, in one call: `buyer_id` and `buyer_name`, `sales_date`, `ticket` (the reservation or receipt id), `status` (01501 reserved or 01502 sold), `pickupby`, when applicable `location`, and `remark` with the message of the buyer.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement, and ask dev@softtouch.be when something seems different.

 | 

 | name
 | type
 | 

 | giftlist id
 | integer
 | required, in the URL

 | id
 | integer
 | required, in the URL, the gift

The response is the updated gift.
Request body:
```
{
    "buyer_name": "Uncle John",
    "buyer_id": "4",
    "sales_date": "2024-10-30",
    "remark": "Hope you enjoy this little gift!",
    "status": "01502",
    "ticket": "1000000002",
    "location": "01700",
    "pickupby": "01601"
}
```
Example response `Gifts` (200):
```json
{
    "key": 2,
    "line": "1",
    "product": 10000301030101,
    "buyer_name": "Uncle John",
    "buyer_id": "4",
    "text3": "",
    "text4": "",
    "text5": "",
    "text6": "",
    "text7": "",
    "text8": "",
    "text9": "",
    "product_desc": "This is a description.",
    "sales_date": "2024-10-30",
    "date2": "2024-10-31",
    "date3": "2024-10-31",
    "date4": "2024-10-31",
    "remark": "Hope you enjoy this little gift!",
    "status": "01502",
    "status2": "",
    "status3": "",
    "total": 100,
    "discount": 25,
    "due": 75,
    "created": "2024-10-31",
    "modified": "2024-11-07 00:00:00",
    "online": true,
    "location": "01700",
    "mustbuy": false,
    "must_buy": false,
    "ticket": 1000000002,
    "timestamp": "2024-11-07 08:59:53",
    "stockstatus": "01802",
    "pickupby": "01601",
    "pre_deliver": false
}
```

### V1 / History
#### Introduction

The stock history of FasMan: one record for every movement of every product, the same list the store sees in the article history. Each record says what happened (`code`), how many pieces, at what price, between which stores, on which register and from which part of FasMan (`module`). Sales, supplier orders and deliveries, stock corrections, transfers, returns to the supplier, price changes and merged or deleted articles all leave a record, whether they were made at the till, in the back office, in MyFasMan Mobile or through this API.

 | 

 | code
 | Movement
 | price
 | remark

 | V
 | sold (negative quantity: taken back from a customer)
 | the line total, or the selling price
 | the receipt number

 | B
 | ordered at the supplier (negative: order cancelled)
 | purchase price
 | 

 | L
 | delivered by the supplier
 | purchase price
 | 

 | S
 | stock correction
 | purchase price
 | 

 | R
 | returned to the supplier (see Returns in version 2)
 | purchase price
 | the return number

 | T
 | sent to another store with a transfer
 | purchase price
 | the transfer number, plus the line remark

 | O
 | received from another store
 | purchase price
 | the transfer number

 | X
 | price changed; quantity 0
 | the old price
 | the old and the new price, e.g. `44.95->49.95`

 | M
 | merged into another article
 | 
 | 

 | D
 | deleted
 | 
 | 

 | C
 | custom movement, for example a cheque created outside a receipt
 | 
 | 

 | !
 | miscellaneous change, for example a barcode added; quantity 0
 | 
 | the new value

`from_store_id` and `to_store_id` are the same store, except for transfers. `module` is a three-letter code of the screen or process that made the movement; calls through this API write `API`, or the `history_module` you send (Products/stock_action writes `WEB` by default). `date` is the date of the movement, which can lie in the past (a delivery booked a day late); `created_at` is the moment it was registered.

The history of a client easily holds millions of records, and grows with every sale.

##### GET History
`https://api.softtouch.eu/1/accounts/{{accountId}}/history`
Lists stock movements, oldest first. Like every list call, the result is limited to 500 records per call; page with `take` and `skip`. Always filter on a period: the table is very large.

When to use it: to export sales and stock movements to an ERP, BI or accounting system, one day at a time (`date_period_created` with yesterday's date, paged); to see what happened to one article (`product_ids` with `variants`, or `product_uids`); or to find the stock corrections or transfers of a period (`codes=S` or `codes=T,O`). For current stock use Products, not the history.

 | 

 | name
 | type
 | 

 | date_period_created
 | string
 | two dates `YYYY-MM-DD,YYYY-MM-DD`: registered between, both included; the safest filter for an incremental export

 | date_period
 | string
 | two dates: movement date between, both included

 | codes
 | string
 | comma separated codes, see the folder description

 | modules
 | string
 | comma separated three-letter module codes

 | product_uids
 | string
 | comma separated 14-digit product keys

 | product_ids
 | string
 | comma separated 6-digit article ids

 | variants
 | string
 | comma separated colour numbers (0 – 99); combine with product_ids

 | from_store_ids
 | string
 | comma separated store ids

 | to_store_ids
 | string
 | comma separated store ids

 | include_vouchers
 | boolean
 | false leaves out cheques, customer discounts and other special articles (product keys from 90000000000000)

 | display
 | string
 | full adds created_at

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier of the movement

- product_uid: the 14-digit product key, or the key of a cheque or special article

- date: the date of the movement

- quantity: pieces; negative for a return by a customer, a cancelled order or a stock decrease

- price: see the table in the folder description

- from_store_id, to_store_id: the store the goods left and the store they went to; the same store except for transfers

- pos_id: the register, empty or 0000 when the movement was not made at a register

- code: the kind of movement

- module: the screen or process that made it

- remark: see the table in the folder description

- created_at (display=full): when the movement was registered
Example response `History` (200):
```json
[
    {
        "key": 2521507,
        "product_uid": 55556101040101,
        "date": "2026-09-14",
        "quantity": 1,
        "price": 29.95,
        "from_store_id": "01",
        "to_store_id": "01",
        "pos_id": "0101",
        "code": "V",
        "module": "IPS",
        "remark": "2010000564",
        "created_at": "2026-09-14 13:50:50"
    },
    {
        "key": 2521510,
        "product_uid": 55556101030101,
        "date": "2026-09-14",
        "quantity": 6,
        "price": 12.5,
        "from_store_id": "01",
        "to_store_id": "01",
        "pos_id": "",
        "code": "L",
        "module": "WEB",
        "remark": "Delivery note 4471",
        "created_at": "2026-09-14 14:02:11"
    },
    {
        "key": 2521511,
        "product_uid": 55556101040101,
        "date": "2026-09-14",
        "quantity": 1,
        "price": 12.5,
        "from_store_id": "01",
        "to_store_id": "02",
        "pos_id": "0101",
        "code": "T",
        "module": "API",
        "remark": "2006000517",
        "created_at": "2026-09-14 14:10:37"
    },
    {
        "key": 2521512,
        "product_uid": 55556101040101,
        "date": "2026-09-14",
        "quantity": 0,
        "price": 29.95,
        "from_store_id": "01",
        "to_store_id": "01",
        "pos_id": "0000",
        "code": "X",
        "module": "ISP",
        "remark": "29.95->34.95",
        "created_at": "2026-09-14 16:45:02"
    }
]
```

### V1 / Invoices
#### Introduction

An invoice in FasMan is always issued by a corporation (see Corporations), which is why the corporation id is part of the URL. Invoices are created in two ways: from a processed receipt, either automatically (`create_invoice` on the receipt) or afterwards with the POST call below and a `receipt_id`; or from scratch with the POST call and your own lines. Amounts are stored excluding VAT (`net_`) and the API calculates the VAT and the gross total. The structured communication returned with the invoice is the payment reference for a bank transfer.

Clients that use the SoftTouch Peppol module send their invoices to the Peppol network from FasMan; the Peppol status is visible with `display=full`.

##### GET Invoices
`https://api.softtouch.eu/1/accounts/{{accountId}}/corporations/01/invoices`
Lists the invoices of a corporation. Like every list call, the result is limited to 500 records per call.

When to use it: to show a business customer its invoices, to fetch the invoice that was created for a receipt (`receipt_id`), or to export invoices to an accounting package.

 | 

 | name
 | type
 | 

 | corporation
 | string
 | required, in the URL, length 2

 | receipt_id
 | integer
 | the invoice created for this receipt

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the invoice number; unique per corporation

- corporation_id: the corporation that issued the invoice

- name_1, name_2: the company name and the contact or second name

- address_1, address_2, postal_code, city, country_iso: the invoice address

- vat_number: the VAT number of the customer

- net_sales_price: total before discount, excluding VAT

- net_discount: total discount, excluding VAT

- net_total: total after discount, excluding VAT

- vat_price: the VAT amount

- gross_total: the amount to pay, including VAT

- structured_communication: the structured message (OGM) for the bank transfer

- items: the invoice lines, each with key (line number), description, quantity, net_unit_price, net_discount, net_total and vat_percentage

With `display=full` the invoice also returns customer_id, invoice_date, expire_date, delivery_date, pay_date, total_paid, receipt_id, miscellaneous_1, remark and the Peppol fields (peppol_sender_id, peppol_sender_scheme, peppol_receiver_id, peppol_receiver_scheme, peppol_status); items add corporation_id, invoice_id and product_uid.
Example response `Invoices` (200):
```json
[
    {
        "key": 20230001,
        "corporation_id": "01",
        "name_1": "SoftTouch Vlaanderen BV",
        "name_2": "",
        "address_1": "Ambachtenlaan 6a",
        "address_2": "",
        "postal_code": "9080",
        "city": "Zeveneken",
        "country_iso": "BE",
        "vat_number": "BE 0506.847.665",
        "net_sales_price": 12.5,
        "net_discount": 0,
        "net_total": 12.5,
        "vat_price": 2.62,
        "gross_total": 15.12,
        "structured_communication": "012/0230/00153",
        "items": [
            {
                "key": 1,
                "description": "T-shirt blue",
                "quantity": 1,
                "net_unit_price": 12.5,
                "net_discount": 0,
                "net_total": 12.5,
                "vat_percentage": 21
            }
        ]
    }
]
```

##### GET Invoices/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/corporations/01/invoices/20230001`
Fetches one invoice of a corporation by its number. The return values are the same as in the list call.

When to use it: to show or download one invoice, for example from the my invoices page of a business customer.

 | 

 | name
 | type
 | 

 | corporation
 | string
 | required, in the URL, length 2

 | id
 | integer
 | required, the invoice number

 | display
 | string
 | full
Example response `Invoices/{{id}}` (200):
```json
{
    "key": 20230001,
    "corporation_id": "01",
    "name_1": "SoftTouch Vlaanderen BV",
    "name_2": "",
    "address_1": "Ambachtenlaan 6a",
    "address_2": "",
    "postal_code": "9080",
    "city": "Zeveneken",
    "country_iso": "BE",
    "vat_number": "BE 0506.847.665",
    "net_sales_price": 12.5,
    "net_discount": 0,
    "net_total": 12.5,
    "vat_price": 2.62,
    "gross_total": 15.12,
    "structured_communication": "012/0230/00153",
    "items": [
        {
            "key": 1,
            "description": "T-shirt blue",
            "quantity": 1,
            "net_unit_price": 12.5,
            "net_discount": 0,
            "net_total": 12.5,
            "vat_percentage": 21
        }
    ]
}
```

##### POST Invoices
`https://api.softtouch.eu/1/accounts/{{accountId}}/corporations/01/invoices`
Creates an invoice for a corporation, either for a processed receipt or from your own lines.

When to use it: when a customer asks for an invoice after the receipt was processed without one (send `receipt_id`; all items of the receipt are invoiced), or when an integration invoices something that is not a receipt (send `items`).

 | 

 | name
 | type
 | 

 | corporation
 | string
 | required, in the URL, length 2

 | receipt_id
 | integer
 | the receipt to invoice; all its items are added. Either receipt_id or items is required

 | items
 | array
 | the invoice lines when no receipt_id is given

 | items[].product_uid
 | integer
 | 14-digit product key; when omitted, description and vat_percentage are required

 | items[].description
 | string
 | 

 | items[].quantity
 | integer
 | 

 | items[].net_unit_price, net_discount, net_total
 | numeric
 | amounts excluding VAT

 | items[].gross_unit_price, gross_discount, gross_total
 | numeric
 | amounts including VAT

 | items[].vat_percentage
 | integer
 | 

 | customer_id
 | integer
 | the customer; when given, the invoice address of the customer is used unless the address fields are sent

 | invoice_address_id
 | integer
 | one of the invoice addresses of the customer

 | name_1, name_2, address_1, address_2, postal_code, city, country_iso, vat_number
 | string
 | the invoice address, when it should differ from the customer's

 | expire_date
 | date
 | due date

 | delivery_date
 | date
 | 

 | pay_date
 | date
 | 

 | total_paid
 | numeric
 | amount already paid

 | miscellaneous_1
 | string
 | 

 | remark
 | string
 | 

The response is the created invoice with `display=full` fields.
Request body:
```
{
    "receipt_id": 2010000564,
    "customer_id": 500,
    "invoice_address_id": 46,
    "expire_date": "2026-10-14",
    "remark": "Invoice requested after purchase"
}
```
Example response `Invoices` (200):
```json
{
    "key": 20230002,
    "corporation_id": "01",
    "name_1": "SoftTouch Vlaanderen BV",
    "name_2": "Stefan de Bakker",
    "address_1": "Ambachtenlaan 6a",
    "address_2": "",
    "postal_code": "9080",
    "city": "Zeveneken",
    "country_iso": "BE",
    "vat_number": "BE 0506.847.665",
    "net_sales_price": 141.32229999999998,
    "net_discount": 0,
    "net_total": 141.32229999999998,
    "vat_price": 79.677683,
    "gross_total": 220.999983,
    "structured_communication": "012/0230/00254",
    "items": [
        {
            "key": 1,
            "description": "Cadeaucheque [001000]",
            "quantity": 1,
            "net_unit_price": 41.3223,
            "net_discount": 0,
            "net_total": 41.3223,
            "vat_percentage": 21
        },
        {
            "key": 2,
            "description": "Ticket no°: 1000000001",
            "quantity": 0,
            "net_unit_price": 0,
            "net_discount": 0,
            "net_total": 0,
            "vat_percentage": 0
        },
        {
            "key": 3,
            "description": "This is the description for the item.",
            "quantity": 1,
            "net_unit_price": 100,
            "net_discount": 0,
            "net_total": 100,
            "vat_percentage": 21
        }
    ]
}
```

### V1 / Invoice addresses
#### Introduction

An invoice address is the company (or person) an invoice is made out to, linked to a customer. A customer can have several: a self-employed customer with a private and a business address, or a buyer who orders for several companies. When an invoice is created for a customer, FasMan uses the customer's first invoice address unless `invoice_address_id` says otherwise, and falls back to the customer details when there is none.

##### GET invoiceaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/invoiceaddresses`
Lists invoice addresses. Like every list call, the result is limited to 500 records per call; filter on the customer.

When to use it: at checkout, when a business customer asks for an invoice, to let them pick one of their saved invoice addresses.

 | 

 | name
 | type
 | 

 | customer_ids
 | string
 | comma separated customer numbers

 | id
 | integer
 | one address

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier, used as `invoice_address_id`

- customer: the customer number

- name: the company name

- surname: the contact name or a second name line

- address, address2, zip, city, country: the address; country is the ISO code

- telephone, mobile, fax: contact details

- email: the address invoices are e-mailed to

- remarks: remarks for this address

- vatid: the VAT number

- created, createdby, modified, modifiedby: audit fields
Example response `invoiceaddresses` (200):
```json
[
    {
        "key": 2,
        "customer": 2,
        "name": "SoftTouch Vlaanderen BV",
        "surname": "",
        "address": "Ambachtenlaan 6a",
        "address2": "",
        "zip": "9080",
        "city": "Zeveneken",
        "country": "BE",
        "telephone": "09/219.00.83",
        "mobile": "",
        "fax": "",
        "email": "dev@softtouch.be",
        "remarks": "",
        "vatid": "BE 0506.847.665",
        "vat_liable": true,
        "created": "2023-04-11",
        "createdby": "1001",
        "modified": "2023-07-19",
        "modifiedby": "1001"
    },
    {
        "key": 3,
        "customer": 3,
        "name": "Diddly Squat Farm Shop",
        "surname": "",
        "address": "Chipping Norton Road 5",
        "address2": "",
        "zip": "OX7 3PE",
        "city": "Chadlington",
        "country": "GB",
        "telephone": "",
        "mobile": "",
        "fax": "",
        "email": "",
        "remarks": "",
        "vatid": "370 4719 94",
        "vat_liable": true,
        "created": "2023-07-03",
        "createdby": "1001",
        "modified": "0000-00-00",
        "modifiedby": ""
    }
]
```

##### GET invoiceaddresses/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/invoiceaddresses/2`
Fetches one invoice address. The return values are the same as in the list call.

When to use it: to show the invoice address of an order, from the `invoice_address_id` of a reservation or receipt.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `invoiceaddresses/{{id}}` (200):
```json
{
    "key": 2,
    "customer": 2,
    "name": "SoftTouch Vlaanderen BV",
    "surname": "",
    "address": "Ambachtenlaan 6a",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "dev@softtouch.be",
    "remarks": "",
    "vatid": "BE 0506.847.665",
    "vat_liable": true,
    "created": "2023-04-11",
    "createdby": "1001",
    "modified": "2023-07-19",
    "modifiedby": "1001"
}
```

##### POST invoiceaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/invoiceaddresses`
Creates an invoice address for a customer.

When to use it: at checkout, when a business customer enters a new invoice address; store it so it can be reused.

 | 

 | name
 | type
 | 

 | customer
 | integer
 | required, the customer number

 | name
 | string
 | last name or company name

 | surname
 | string
 | first name or contact name

 | address, address2
 | string
 | street and number, and an extra address line

 | zip, city
 | string
 | 

 | country
 | string
 | ISO code, length 2

 | telephone, mobile, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | remarks
 | string
 | 

 | vatid
 | string
 | the VAT number

 | vat_liable
 | boolean
 | the company is liable to VAT

The response is the created address; use its key as `invoice_address_id`.
Request body:
```
{
    "customer": 2,
    "name": "SoftTouch BVBA",
    "surname": "Stefan de Bakker",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "BE 0506.847.665",
    "vat_liable": 1
}
```
Example response `invoiceaddresses` (200):
```json
{
    "key": 4,
    "customer": 2,
    "name": "SoftTouch BVBA",
    "surname": "Stefan de Bakker",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "BE 0506.847.665",
    "vat_liable": true,
    "created": "2023-07-19 00:00:00",
    "createdby": "1001",
    "modified": "2023-07-19 00:00:00",
    "modifiedby": "1001"
}
```

##### PATCH invoiceaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/invoiceaddresses/4`
Updates an invoice address. Only the parameters that are sent are changed.

When to use it: when the customer edits a saved invoice address.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | surname
 | string
 | first name or contact name

 | address, address2
 | string
 | street and number, and an extra address line

 | zip, city
 | string
 | 

 | country
 | string
 | ISO code, length 2

 | telephone, mobile, fax
 | string
 | 

 | email
 | string
 | valid e-mail address

 | remarks
 | string
 | 

 | vatid
 | string
 | the VAT number

 | vat_liable
 | boolean
 | 

The response is the updated address.
Request body:
```
{
    "customer": 2,
    "name": "SoftTouch BVBA",
    "surname": "",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "BE 0506.847.665",
    "vat_liable": 1
}
```
Example response `invoiceaddresses` (200):
```json
{
    "key": 4,
    "customer": 2,
    "name": "SoftTouch BVBA",
    "surname": "",
    "address": "Ambachtenlaan 6A",
    "address2": "",
    "zip": "9080",
    "city": "Zeveneken",
    "country": "BE",
    "telephone": "09/219.00.83",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "BE 0506.847.665",
    "vat_liable": true,
    "created": "2023-07-19",
    "createdby": "1001",
    "modified": "2023-07-19 00:00:00",
    "modifiedby": "1001"
}
```

##### DELETE invoiceaddresses
`https://api.softtouch.eu/1/accounts/{{accountId}}/invoiceaddresses/4`
Deletes an invoice address. The response is `true`.

When to use it: when the customer removes a saved invoice address.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Request body:
```
{
    "customer": 1,
    "name": "",
    "surname": "",
    "address": "",
    "address2": "",
    "zip": "",
    "city": "",
    "country": "BE",
    "telephone": "",
    "mobile": "",
    "fax": "",
    "email": "test@softtouch.be",
    "remarks": "",
    "vatid": "0",
    "vat_liable": 1
}
```
Example response `invoiceaddresses` (200):
```json
true
```

### V1 / Messages
#### Introduction

Messages are short notes sent to a store, a point of sale or a FasMan user. They appear on the screen of the point of sale and, for some subjects, trigger a print on the receipt printer. That makes them the way to warn a store about something that happened online: an order that must be prepared, a reservation or receipt to print, a transfer that is coming.

Reserved subjects trigger an action at the point of sale:

 | 

 | subject
 | message
 | Action at the POS

 | PRINT RECEIPT (or PRINT TICKET)
 | the receipt number
 | prints the receipt with its voucher tickets

 | PRINT RECEIPT MIN (or PRINT TICKET MIN)
 | the receipt number
 | prints the receipt only, without the voucher tickets

 | PRINT RESERVATION
 | the reservation number
 | prints the reservation ticket

 | PRINT TRANSFER
 | the transfer number
 | prints the transfer ticket

 | PRINT INVOICE
 | the invoice number
 | prints the invoice, on the ticket printer or through the invoice report, as the client configured it

Any other subject is shown, and printed, as a plain message on the POS. That is how a web shop leaves a readable note for the staff: subject New order - Webshop: 2010000564, message with the customer, the delivery type, the articles and the remark, one line each. The FasMan POS on Windows and MyFasMan Mobile with an on-device printer both handle these subjects.

##### GET Messages
`https://api.softtouch.eu/1/accounts/{{accountId}}/messages`
Lists messages. Like every list call, the result is limited to 500 records per call.

When to use it: to check whether a message you sent was received and acknowledged by the store.

 | 

 | name
 | type
 | 

 | id
 | integer
 | one message

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier of the message

- store, pos, user: the store, POS and user the message was sent to

- subject: the subject

- message: the text

- date, time: when the message was sent

- acknowledged: the message was received and acknowledged at the POS

With `display=full` the message also returns from_store_id, from_pos_id and from_user_id.
Example response `Messages` (200):
```json
[
    {
        "key": 5,
        "store": "01",
        "pos": "0101",
        "user": "1001",
        "subject": "PRINT TICKET",
        "message": "2010000930",
        "date": "2023-07-19",
        "time": "17:16:10",
        "acknowledged": "0"
    }
]
```

##### GET Messages/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/messages/5`
Fetches one message. The return values are the same as in the list call.

When to use it: to check whether one message you sent was acknowledged.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | display
 | string
 | full
Example response `Messages/{{id}}` (200):
```json
{
    "key": 5,
    "store": "01",
    "pos": "0101",
    "user": "1001",
    "subject": "PRINT TICKET",
    "message": "2010000930",
    "date": "2023-07-19",
    "time": "17:16:10",
    "acknowledged": "0"
}
```

##### POST Messages
`https://api.softtouch.eu/1/accounts/{{accountId}}/messages`
Sends a message to a store, a point of sale or a user. At least one of `store`, `pos` and `user` is required.

When to use it: right after creating a web shop order, to print the reservation or receipt in the store that has to prepare it (`subject` PRINT RESERVATION or PRINT TICKET), or to warn a store that an article sold online must be kept aside. For push notifications to MyFasMan Mobile use App_notification in API version 2 instead.

 | 

 | name
 | type
 | 

 | store
 | string
 | length 2; the store; when only the store is given the message goes to its point of sales

 | pos
 | string
 | length 4; one point of sale

 | user
 | string
 | length 4; one FasMan user

 | subject
 | string
 | free text, or one of the reserved subjects in the folder description

 | message
 | string
 | required; the text (line breaks allowed), or the document number for a reserved subject

 | from_store_id
 | string
 | length 2, the sender

 | from_pos_id
 | string
 | length 4

 | from_user_id
 | string
 | length 4

The response is the created message.
Request body:
```
{
    "store": "01",
    "subject": "PRINT RESERVATION",
    "message": "999100002"
}
```
Example response `Messages` (200):
```json
{
    "key": 5,
    "store": "01",
    "pos": "0101",
    "user": "1001",
    "subject": "PRINT TICKET",
    "message": "2010000930",
    "date": "2023-07-19 00:00:00",
    "time": "17:16:10",
    "acknowledged": "0"
}
```
Example response `Messages` (200):
```json
{
    "key": 6,
    "store": "01",
    "pos": "",
    "user": "",
    "subject": "PRINT RESERVATION",
    "message": "999100002",
    "date": "2026-09-14",
    "time": "11:42",
    "acknowledged": false
}
```
Example response `Messages (note for the staff)` (200):
```json
{
    "key": 7,
    "store": "",
    "pos": "0101",
    "user": "",
    "subject": "New order - Webshop: 2010000564",
    "message": "Customer: Jane Doe\nType: shipment (bpost)\nArticles: 1 x Red t-shirt L, 1 x Blue t-shirt M\nRemark: please gift wrap",
    "date": "2026-09-14",
    "time": "11:43",
    "acknowledged": false
}
```

### V1 / POS
#### Introduction

A point of sale (POS) is a register in a store. Its id has four characters: the store id followed by two digits, so `0101` is the first register of store 01 and `0199` might be the web shop register of that store. Receipts, reservations, cheques and messages refer to a POS, and every API account has a default POS. Web shops usually get their own POS in the store that handles online orders, so online sales can be told apart from counter sales.

##### GET POS
`https://api.softtouch.eu/1/accounts/{{accountId}}/pos`
Lists the points of sale of all stores. Like every list call, the result is limited to 500 records per call.

When to use it: to find the POS that belongs to a store (for messages, transfers or program variables) and to translate POS ids in receipts into names.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the POS id (4 characters)

- txt: the description

- store_id: the store the POS belongs to

- active: whether the POS is still in use
Example response `POS` (200):
```json
[
    {
        "key": "0101",
        "txt": "Kassa 1",
        "store_id": "01",
        "active": true
    }
]
```

### V1 / Postal codes
#### Introduction

The postal code table FasMan uses to complete addresses at the point of sale: postal code, city and country. A web shop can use it to validate or auto-complete the city field of an address form with the same list the stores use.

##### GET Postal_codes
`https://api.softtouch.eu/1/accounts/{{accountId}}/postal_codes`
Lists postal codes. Like every list call, the result is limited to 500 records per call; filter on the postal code or the city.

When to use it: to auto-complete the city when the customer types a postal code, or the other way round.

 | 

 | name
 | type
 | 

 | postal_code
 | string
 | starts with

 | city
 | string
 | starts with

 | country
 | string
 | ISO code

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the record

- postal_code: the postal code

- city: the city or municipality

- country: the ISO country code
Example response `Postal_codes` (200):
```json
[
    {
        "id": 1,
        "postal_code": "1331",
        "city": "Rosieres",
        "country": "BE"
    },
    {
        "id": 2,
        "postal_code": "1082",
        "city": "Bruxelles",
        "country": "BE"
    },
    {
        "id": 3,
        "postal_code": "1000",
        "city": "Bruxelles",
        "country": "BE"
    },
    {
        "id": 4,
        "postal_code": "1000",
        "city": "Brussel",
        "country": "BE"
    },
    {
        "id": 5,
        "postal_code": "9992",
        "city": "Middelburg",
        "country": "BE"
    },
    {
        "id": 6,
        "postal_code": "9991",
        "city": "Adegem",
        "country": "BE"
    },
    {
        "id": 7,
        "postal_code": "9990",
        "city": "Maldegem",
        "country": "BE"
    },
    {
        "id": 8,
        "postal_code": "9988",
        "city": "Watervliet",
        "country": "BE"
    },
    {
        "id": 9,
        "postal_code": "9988",
        "city": "Waterland-Oudeman",
        "country": "BE"
    },
    {
        "id": 10,
        "postal_code": "9982",
        "city": "Sint-Jan-In-Eremo",
        "country": "BE"
    },
    {
        "id": 11,
        "postal_code": "9981",
        "city": "Sint-Margriete",
        "country": "BE"
    },
    {
        "id": 12,
        "postal_code": "9980",
        "city": "Sint-Laureins",
        "country": "BE"
    },
    {
        "id": 13,
        "postal_code": "9971",
        "city": "Lembeke",
        "country": "BE"
    },
    {
        "id": 14,
        "postal_code": "9970",
        "city": "Kaprijke",
        "country": "BE"
    },
    {
        "id": 15,
        "postal_code": "9968",
        "city": "Oosteeklo",
        "country": "BE"
    },
    {
        "id": 16,
        "postal_code": "9968",
        "city": "Bassevelde",
        "country": "BE"
    },
    {
        "id": 17,
        "postal_code": "9961",
        "city": "Boekhoute",
        "country": "BE"
    },
    {
        "id": 18,
        "postal_code": "9960",
        "city": "Assenede",
        "country": "BE"
    },
    {
        "id": 19,
        "postal_code": "9950",
        "city": "Waarschoot",
        "country": "BE"
    },
    {
        "id": 20,
        "postal_code": "9940",
        "city": "Sleidinge",
        "country": "BE"
    },
    {
        "id": 21,
        "postal_code": "9940",
        "city": "Kluizen",
        "country": "BE"
    },
    {
        "id": 22,
        "postal_code": "9940",
        "city": "Evergem",
        "country": "BE"
    },
    {
        "id": 23,
        "postal_code": "9940",
        "city": "Ertvelde",
        "country": "BE"
    },
    {
        "id": 24,
        "postal_code": "9932",
        "city": "Ronsele",
        "country": "BE"
    },
    {
        "id": 25,
        "postal_code": "9931",
        "city": "Oostwinkel",
        "country": "BE"
    },
    {
        "id": 26,
        "postal_code": "9930",
        "city": "Zomergem",
        "country": "BE"
    },
    {
        "id": 27,
        "postal_code": "9921",
        "city": "Vinderhoute",
        "country": "BE"
    },
    {
        "id": 28,
        "postal_code": "9920",
        "city": "Lovendegem",
        "country": "BE"
    },
    {
        "id": 29,
        "postal_code": "9910",
        "city": "Ursel",
        "country": "BE"
    },
    {
        "id": 30,
        "postal_code": "9910",
        "city": "Knesselare",
        "country": "BE"
    },
    {
        "id": 31,
        "postal_code": "9900",
        "city": "Eeklo",
        "country": "BE"
    },
    {
        "id": 32,
        "postal_code": "9890",
        "city": "Vurste",
        "country": "BE"
    },
    {
        "id": 33,
        "postal_code": "9890",
        "city": "Semmerzake",
        "country": "BE"
    },
    {
        "id": 34,
        "postal_code": "9890",
        "city": "Gavere",
        "country": "BE"
    },
    {
        "id": 35,
        "postal_code": "9890",
        "city": "Dikkelvenne",
        "country": "BE"
    },
    {
        "id": 36,
        "postal_code": "9890",
        "city": "Baaigem",
        "country": "BE"
    },
    {
        "id": 37,
        "postal_code": "9890",
        "city": "Asper",
        "country": "BE"
    },
    {
        "id": 38,
        "postal_code": "9881",
        "city": "Bellem",
        "country": "BE"
    },
    {
        "id": 39,
        "postal_code": "9880",
        "city": "Poeke",
        "country": "BE"
    },
    {
        "id": 40,
        "postal_code": "9880",
        "city": "Lotenhulle",
        "country": "BE"
    },
    {
        "id": 41,
        "postal_code": "9880",
        "city": "Aalter",
        "country": "BE"
    },
    {
        "id": 42,
        "postal_code": "9870",
        "city": "Zulte",
        "country": "BE"
    },
    {
        "id": 43,
        "postal_code": "9870",
        "city": "Olsene",
        "country": "BE"
    },
    {
        "id": 44,
        "postal_code": "9870",
        "city": "Machelen (o.-Vl.)",
        "country": "BE"
    },
    {
        "id": 45,
        "postal_code": "9860",
        "city": "Scheldewindeke",
        "country": "BE"
    },
    {
        "id": 46,
        "postal_code": "9860",
        "city": "Oosterzele",
        "country": "BE"
    },
    {
        "id": 47,
        "postal_code": "9860",
        "city": "Moortsele",
        "country": "BE"
    },
    {
        "id": 48,
        "postal_code": "9860",
        "city": "Landskouter",
        "country": "BE"
    },
    {
        "id": 49,
        "postal_code": "9860",
        "city": "Gijzenzele",
        "country": "BE"
    },
    {
        "id": 50,
        "postal_code": "9860",
        "city": "Balegem",
        "country": "BE"
    },
    {
        "id": 51,
        "postal_code": "9850",
        "city": "Vosselare",
        "country": "BE"
    },
    {
        "id": 52,
        "postal_code": "9850",
        "city": "Poesele",
        "country": "BE"
    },
    {
        "id": 53,
        "postal_code": "9850",
        "city": "Nevele",
        "country": "BE"
    },
    {
        "id": 54,
        "postal_code": "9850",
        "city": "Merendree",
        "country": "BE"
    },
    {
        "id": 55,
        "postal_code": "9850",
        "city": "Landegem",
        "country": "BE"
    },
    {
        "id": 56,
        "postal_code": "9850",
        "city": "Hansbeke",
        "country": "BE"
    },
    {
        "id": 57,
        "postal_code": "9840",
        "city": "Zevergem",
        "country": "BE"
    },
    {
        "id": 58,
        "postal_code": "9840",
        "city": "De Pinte",
        "country": "BE"
    },
    {
        "id": 59,
        "postal_code": "9831",
        "city": "Deurle",
        "country": "BE"
    },
    {
        "id": 60,
        "postal_code": "9830",
        "city": "Sint-Martens-Latem",
        "country": "BE"
    },
    {
        "id": 61,
        "postal_code": "9820",
        "city": "Schelderode",
        "country": "BE"
    },
    {
        "id": 62,
        "postal_code": "9820",
        "city": "Munte",
        "country": "BE"
    },
    {
        "id": 63,
        "postal_code": "9820",
        "city": "Merelbeke",
        "country": "BE"
    },
    {
        "id": 64,
        "postal_code": "9820",
        "city": "Melsen",
        "country": "BE"
    },
    {
        "id": 65,
        "postal_code": "9820",
        "city": "Lemberge",
        "country": "BE"
    },
    {
        "id": 66,
        "postal_code": "9820",
        "city": "Bottelare",
        "country": "BE"
    },
    {
        "id": 67,
        "postal_code": "9810",
        "city": "Nazareth",
        "country": "BE"
    },
    {
        "id": 68,
        "postal_code": "9810",
        "city": "Eke",
        "country": "BE"
    },
    {
        "id": 69,
        "postal_code": "9800",
        "city": "Zeveren",
        "country": "BE"
    },
    {
        "id": 70,
        "postal_code": "9800",
        "city": "Wontergem",
        "country": "BE"
    },
    {
        "id": 71,
        "postal_code": "9800",
        "city": "Vinkt",
        "country": "BE"
    },
    {
        "id": 72,
        "postal_code": "9800",
        "city": "Sint-Martens-Leerne",
        "country": "BE"
    },
    {
        "id": 73,
        "postal_code": "9800",
        "city": "Petegem-Aan-De-Leie",
        "country": "BE"
    },
    {
        "id": 74,
        "postal_code": "9800",
        "city": "Meigem",
        "country": "BE"
    },
    {
        "id": 75,
        "postal_code": "9800",
        "city": "Grammene",
        "country": "BE"
    },
    {
        "id": 76,
        "postal_code": "9800",
        "city": "Gottem",
        "country": "BE"
    },
    {
        "id": 77,
        "postal_code": "9800",
        "city": "Deinze",
        "country": "BE"
    },
    {
        "id": 78,
        "postal_code": "9800",
        "city": "Bachte-Maria-Leerne",
        "country": "BE"
    },
    {
        "id": 79,
        "postal_code": "9800",
        "city": "Astene",
        "country": "BE"
    },
    {
        "id": 80,
        "postal_code": "9790",
        "city": "Wortegem-Petegem",
        "country": "BE"
    },
    {
        "id": 81,
        "postal_code": "9790",
        "city": "Wortegem",
        "country": "BE"
    },
    {
        "id": 82,
        "postal_code": "9790",
        "city": "Petegem-Aan-De-Schelde",
        "country": "BE"
    },
    {
        "id": 83,
        "postal_code": "9790",
        "city": "Ooike (wortegem-Petegem)",
        "country": "BE"
    },
    {
        "id": 84,
        "postal_code": "9790",
        "city": "Moregem",
        "country": "BE"
    },
    {
        "id": 85,
        "postal_code": "9790",
        "city": "Elsegem",
        "country": "BE"
    },
    {
        "id": 86,
        "postal_code": "9772",
        "city": "Wannegem-Lede",
        "country": "BE"
    },
    {
        "id": 87,
        "postal_code": "9771",
        "city": "Nokere",
        "country": "BE"
    },
    {
        "id": 88,
        "postal_code": "9770",
        "city": "Kruishoutem",
        "country": "BE"
    },
    {
        "id": 89,
        "postal_code": "9750",
        "city": "Zingem",
        "country": "BE"
    },
    {
        "id": 90,
        "postal_code": "9750",
        "city": "Ouwegem",
        "country": "BE"
    },
    {
        "id": 91,
        "postal_code": "9750",
        "city": "Huise",
        "country": "BE"
    },
    {
        "id": 92,
        "postal_code": "9700",
        "city": "Welden",
        "country": "BE"
    },
    {
        "id": 93,
        "postal_code": "9700",
        "city": "Volkegem",
        "country": "BE"
    },
    {
        "id": 94,
        "postal_code": "9700",
        "city": "Oudenaarde",
        "country": "BE"
    },
    {
        "id": 95,
        "postal_code": "9700",
        "city": "Ooike (oudenaarde)",
        "country": "BE"
    },
    {
        "id": 96,
        "postal_code": "9700",
        "city": "Nederename",
        "country": "BE"
    },
    {
        "id": 97,
        "postal_code": "9700",
        "city": "Mullem",
        "country": "BE"
    },
    {
        "id": 98,
        "postal_code": "9700",
        "city": "Melden",
        "country": "BE"
    },
    {
        "id": 99,
        "postal_code": "9700",
        "city": "Mater",
        "country": "BE"
    },
    {
        "id": 100,
        "postal_code": "9700",
        "city": "Leupegem",
        "country": "BE"
    }
]
```

##### GET Postal_codes/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/postal_codes/291`
Fetches one postal code record by its id.

When to use it: rarely; to re-read one record.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `Postal_codes/{{id}}` (200):
```json
{
    "id": 291,
    "postal_code": "9080",
    "city": "Zeveneken",
    "country": "BE"
}
```

##### POST Postal_codes
`https://api.softtouch.eu/1/accounts/{{accountId}}/postal_codes`
Adds a postal code.

When to use it: only in agreement with the client, when the web shop maintains the postal code list of FasMan.

 | 

 | name
 | type
 | 

 | postal_code
 | string
 | required

 | city
 | string
 | required

 | country
 | string
 | required, ISO code, length 2

The response is the created record.
Request body:
```
{
    "postal_code": "4561 GC",
    "city": "Hulst",
    "country": "NL"
}
```
Example response `Postal_codes` (200):
```json
{
    "id": 3246,
    "postal_code": "9080",
    "city": "Lochristi",
    "country": "BE"
}
```

##### PATCH Postal_codes
`https://api.softtouch.eu/1/accounts/{{accountId}}/postal_codes/3246`
Updates a postal code record.

When to use it: to correct a city name or country in agreement with the client.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | postal_code
 | string
 | 

 | city
 | string
 | 

 | country
 | string
 | ISO code, length 2

The response is the updated record.
Request body:
```
{
    "postal_code": "9000",
    "city": "Gent",
    "country": "BE"
}
```
Example response `Postal_codes` (200):
```json
{
    "id": 3246,
    "postal_code": "9080",
    "city": "Lochristi",
    "country": "BE"
}
```

##### DELETE Postal_codes
`https://api.softtouch.eu/1/accounts/{{accountId}}/postal_codes/3246`
Deletes a postal code record. The response is `true`.

When to use it: to remove a wrong record in agreement with the client.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Postal_codes` (200):
```json
true
```

### V1 / Products
#### Introduction

Products are the essence of every shop. In the end, a shop without products would not attract many customers and without customers there is no income. Let us start with an example and see how it is built up in the SoftTouch API. As example we take a red t-shirt.

#### General information

The brand name of this particular product is SoftTouch. All the information about this brand can be found in the brand model. The id of this brand, which is used to refer to in the product, exists of three characters, usually numbers.
In fashion it is quite common that each half a year is a new season, usually following the latest fashion trends. Winter 2023 and Summer 2023 are two examples of such seasons. The red t-shirt is a product that is probably not entitled to a particular season, since the design of the shirt won’t change for a long time. The use of a so called ‘Never out of Stock’ season is appropriate here. The seasons and their information can be found in the season model. The id of a season exists of three characters, usually referring to the season somehow. The id for Summer 2023 could be ‘S23’ for example or, to make ordering easier, ‘123’. Winter 2023 could be ‘W23’ or ‘123’. Never out of stock seasons often have the id ‘NOS’ or ‘999’.
Articles can be filed in different categories. The values for these categories should be recurring to many products and not specific to one or a few products. Good examples would be the sex – male, female, etc. – and article group – trousers, t-shirts, etc. These categories can be found in the category model. There are seven category groups. The id of each category exists of four characters. The first two characters represent which group it belongs to – ‘0102’ belongs to category 1 while ‘0245’ belongs to category 2. The last two characters are the id within the group, mostly numeric but possibly alphabetic. A value ending in `00` (0100, 0200, ...) means no category in that group. For most clients the first category is the sex and the second category the article group.
A product usually has a unique article number or reference and often an article name. The latter is mostly, but not always unique for the article. For our shirt the reference might be ‘ABC-123’ and the name might be ‘Red t-shirt’. This information can be found in the detail of the article. The article reference can usually be found in the first detail and the name of the article in the second. If there is no reference, the name could be found in the first. There are five detail fields to store product specific data.
A product can also have a description. This is usually some limited information to aid the sales person in order to recognise the article in a quick glance. ‘Red t-shirt short sleeve’ could be an example for our shirt. While there are five description fields, usually only the first is used. While the description can contain any data, it should not be a long text which is used to show on a web shop for instance. There are other places for this, which will be covered later.
Most articles have different sizes. This will be covered in more depth later. For now it is enough to know that each product needs a link to a size table. The information of the size tables can be found in the size table model. Each size table has an id of two characters, usually numeric.
To make the product unique, there exist an id, which has no link to any data of the supplier. This is a numeric value with six digits, i.e. higher or equal to 100000 and lower than 900000.

#### Colours and variants

Of our example red t-shirt there is also a yellow and blue version. Often the supplier has for each colour its own code, something like ‘R001’. In the API this can be found in colorbrand as ‘R001 - red'.
When suppliers use many different names for almost the same colour, it might be easier to refer to them with the same name. For the colour red there might be the description cherry, rose, jam, merlot, garnet, crimson, etc. They could all be linked to one of the colours in the color model. The id of such a colour exists of four characters, usually numbers. The use of these colours is not mandatory, so the color parameter for a product might be an empty string.
A product with different colours or variants can use the same id with a different variant number. This is a numeric value not higher than 99.

#### Sizes

As mentioned before, most products have different sizes. For our shirt the size table that is being used might look something like this:

In the SoftTouch API each size has a position on the size table. It always starts from position one and increments with one for each following size. The positions on this size table might look something like this:

Size tables in the SoftTouch API can be two-dimensional. Good examples for such size tables are those for trousers with leg length sizes or bras with cup sizes:

The first dimension of a size table is represented by the X size, while the second dimension is represented by the Y size. In the last size table size 38/L34 would be represented by sizeX ‘04’ and sizeY ‘03’. When a size table represents one dimensional sizes sizeY will always be ‘01’. Some products do not have a size or exist in one size only. In this case a size table with one size is needed. The one size on the size table is often referred to as ‘TU’, which is an abbreviation for Taille Unique.

#### Stores

The details of the stores can be found in the store model. The id referring to the store in a product exists of two characters, always numeric. A small topic for a separate chapter, but it brings us to the key of a product.
The key of a product is the combination of five parameters, the id, the variant, sizeX, sizeY and the store. It is a numeric value existing of 14 digits. The first six digits are the id, the next two the variant. The ninth and tenth and the eleventh and twelfth digits represent sizeX and sizeY. The last two digits are the store.
Since these five parameters make a product unique, it is technically possible that some of the other parameters might differ for the same product, having another key. For example the VAT percentage of a product might be 21 in one store, while in another it might be 20 – this store will be located in another country. While this theory could work for all other parameters, it should not be so for many parameters – season, brand and the category parameters to name a few.

#### More information

What follows are a few more parameters a product can have.
edi: Suppliers often provide barcodes for the products. These barcodes can be found in the edi field.

stock, backorder: The stock is the number of pieces available to sell. Pieces that are physically in stock but reserved for a customer are not available and are not counted. The backorder is the number of pieces still to be delivered by the supplier.

price: The selling price of the product. Note that this can differ over different sizes and even stores.

salesprice, salesdiscount, salesstart, salesend: These four parameters have everything to do with the sales period and the discount on the product during this period. The price would be the new price of the article while the discount is a percentage. When the price is not 0, the discount parameter will be ignored. The sales period starts on the start date and ends on the end date, the end date not including (this contradicts with the logic at many other places)! Note that there is the discount model which is used to set a discount period on a group of articles. If a discount is set on a product level, this will get the priority. Know that these parameters are not the only ones that might have an impact on the discount of an article. To make sure it is better to use the following four parameters.

discount_date, discount_percentage, discount_value, netto_price: On a certain date – represented by the discount_date parameter – the article might be entitled to a discount. The percentage and the value of the discount are respectively represented by the percentage and discount_value. The new price is represented by the parameter netto_price. These parameters take all possible modifiers for the discount in account. Therefore it could as well be that a discount is taking effect while the previous four sales parameters seem to contradict this. In short: show and sell at netto_price and use discount_percentage for the sale badge; the four sales parameters are informational.

vat: The VAT percentage of the product

online: Whether the product is available online. Usually 0 or 1; clients with several online channels use the values 1 to 5, one per channel, which SoftTouch will indicate. The flags for the other channels are online2 to online5, and every text and file item carries the same flags, so a photo or a text can be limited to one channel

status: The status of an article. There are three possible values, being A (active), I (inactive) and D (deleted). Only articles with the active status should be used.

timestamp: The moment an article has been changed the last time. There is a separate chapter that covers this parameter in more depth. Since it has some subtle nuances, it is very important that this chapter is covered when relying on this parameter.

texts, files, related: These three parameters are arrays with data usually used by web designers. The texts are used for large texts in order to give customers more information about the product. The files are mostly used for pictures, but can in theory be any file format. The related array contains the combination of ids and variants to other products which are related in some way to the product. In the example this could be the trousers that match the shirt. These three parameters are explained in more depth in the next part of this chapter. The care symbols of a garment are in a fourth array, wash_instructions, a list of ids that map to the Wash_instructions resource of API version 2.

first_delivery, last_delivery: The first and last date a product has been delivered. This is the same for all sizes in all stores of the same product.

expected_delivery: the date the next delivery is expected, from the open supplier orders.

in_the_picture: the article is flagged as a highlight in FasMan; use it for a new in or featured block.

online_sort: the sort order the client gave the article for the web shop.

#### Text, files and relations

A product has a few array parameters which are typically used for web shops. These parameters are the texts, files and related parameter. An example can be found in the following part of this chapter.
In one of the previous chapters we covered that the description parameters can contain some small text describing the article. While this is mostly sufficient for the sales person, it usually is not enough for a buying customer. The place for long texts is the texts parameter. The length of the text in each of the array items should be more than enough.
Each item is linked to a type. The type represents for example a title, a description or even some information about the fabric or some washing instructions. Since the type indicates what the information is about, the web developer can decide where and how the information can be displayed on the web shop.
Since there can be multiple text items for the same type it might be useful to know in what order they should be displayed. The sort parameter can be used for that. Use this parameter with caution, however. Since a text item can be linked to either one variant (colour) of a certain product, or all variants the sort parameter does not always make sense. So, when it is used, it is best to agree with stock managers of the shop that texts are either linked to either one variant or all variants of a product. Also take in account that the default value of the sort parameter is 1, unless the stock manager changes this value.
The files parameter represent all file names linked to the product. Usually these files are pictures. File items have a type and sort parameter, which work in the same way as with the text items. Also, just like text items, file items can be linked to either one variant of a product or all variants of the product.
Products can be related to other products in some way. The shirt might for example have perfectly matching trousers. The related parameter lists these articles in an array. In these items the related parameter represents the first 8 characters of the product uid (id + variant) that relates with the article. It is important to know that the relation does not go in two ways by default. When a product (A) has a related product (B), this related product (B) does not have the original product (A) as a related product, unless it is explicitly linked by the stock manager.

##### GET Products
`https://api.softtouch.eu/1/accounts/{{accountId}}/products`
#### Retrieve product data

When to use it: the nightly full sync (`online=1`, paged with `take` and `skip`), the ten minute sync (`updated_since_minutes=10&detail=stock`, or `since` with a date) and any listing the web shop needs by season, brand or category.

Lists products. Without filters the call returns the first 100 products of the account; with `take` (max. 500) and `skip` you page through the rest. In practice you always add filters, and for a web shop `online=1` is the first one.
Filters

id: an integer value representing the id of an article. This should always be between 100000 and 900000. Only products with this id will be in the result set.
uid: an integer value representing a part of, or the entire uid. The value can be between 100000 and 90000000000000. This can be useful for example to find products with a certain id and variant. In this case an integer with 8 digits needs to be set as a value to the parameter. For example “uid”: 10024602 will return all products with id 100246 and variant 2.
ids: this parameter works in the same way as the uid parameter, with the difference that multiple integers can be passed, separated by a comma. For example “ids”: “10024602,100247” will return all products with id 100246 and variant 2 together with all the products with id 100247.
seasons, brands, detailXs, categoryXs, foreign_ids: These parameters filter on respectively the season, brand, detail1 through detail5, category1 through category7 and the foreign_id of the products. Note that for detailXs and categoryXs the ‘X’ needs to be replaced by a number. All parameters are comma separated. The seasons and brands parameters expect three characters per id. The stores parameter expects two characters per id and the categoryXs expects four characters per id.
withstock: This parameter is useful to receive only the products that have actual stock to sell. Note that if a product might still be physically in stock, but is reserved for a customer, it will not be in stock. The value of this parameter should be a boolean. `stock_greater_than` does the same with a threshold: only products with more than that number of pieces.
online: only products that are online for a channel: 1 for the web shop, 2 to 5 for the other channels of the client, comma separated for several. Products taken offline are not returned, so keep a local list to detect them (see Keeping the catalogue in sync).
discount_online: 1 to 5, calculate the discount fields for that channel without filtering on it; use it in the incremental sync.
since, until, updated_since_minutes: Return the products that changed since or until a certain date, or in the last n minutes. The product parameter timestamp is taken as a reference. While this is accurate to a certain extent, it is important to know how to use this. There is a separate chapter dedicated to this, which is a must read when relying on these parameters.
discount_date: In the previous chapter the discount_ parameters are introduced. By default the discount_date will be set as the current date. With this parameter, however, the discount and netto price on another date can be retrieved.
detail: The result of the request can quickly become quite large. When you are only interested in the stock of the products this parameter can be used with the value “stock”. The result will only show the key, edi, store and stock parameters. Other values exist (`articles`, `articles_with_sizes`, `max_sizes`) for SoftTouch's own applications; ask before relying on them.
since_first_delivery, until_first_delivery, since_last_delivery, until_last_delivery: These parameters expect a date value and filter on the first and last delivery date of the product.
display: `full` adds the purchase side of the product (order_number, reorder, sold, full_stock, return, transfer, customer_order_quantity, purchase prices and mark-up, wholesale_price, online2 to online5, first_delivery, last_delivery, expected_delivery, in_the_picture, online_sort) and `product_detail`, the extended article record with category8 to category20 for clients with more than seven category groups.
take, skip: paging, maximum 500 per call.

#### More about timestamp

The timestamp parameter, and with it the since and until filters, is not reliable for everything. Since this is important, it deserves its own chapter.
First things first. The timestamp parameter did not cover everything in the past. When the description was changed or the physical stock was changed, the article was also changed. However, when an article was reserved, the actual product or stock was not changed, and therefore the timestamp was not updated. After all, the product did not change, the availability, however, did. The same logic applies to the online parameter or the texts, files and related parameters. Current database versions make sure that the timestamp is also updated when a reservation is made or an article is set online.
So it is reliable to a certain extent. However there is one thing that is not taken into account. There is a possibility to set a sales period based on different levels such as brands, seasons and categories. When such a sale period is set, it is usually set for the future, and when the period takes effect no product data changes, so the timestamp stays the same. That is why the nightly full sync (which fetches every online product with its discount fields) remains necessary next to the incremental sync.

#### Keeping the catalogue in sync

What SoftTouch's own web shop does, and what has proven to work for other integrations:

- Nightly: `online=1&display=full`, plus `stores` when the shop sells from some stores only, paged with `take=500` and `skip`; keep paging while a page is full. Mark everything you had beforehand and remove what did not come back, but only when every page succeeded.

- Every ten minutes, asking for the last fifteen: the same call with `updated_since_minutes=15` (a window longer than the interval, so nothing is missed when a call runs late; a change in the overlap is returned twice and upserted twice, which is harmless) and `discount_online=1` instead of `online`, so that products that went offline are returned once more: any product whose online flag for your channel is no longer set is taken offline. Upsert the rest, with stock, price and discount fields.

- Escalation: before paging the incremental call, ask for `take=1&skip=10000` with the same filters. When that returns a product, thousands of products changed (a price import, a season switch) and a full sync is faster.

- On click: `ids=` with the 8-digit article id + variant returns every size and store of one colour; sum `stock` over the stores you sell from. Hold the stock locally while the customer pays: the API only reduces it when the receipt or reservation is created.

- Prices: sell at `netto_price` and show `discount_percentage`; do not compute prices from the sales fields.
Example response `Products` (200):
```json
[
    {
        "key": 55556101040101,
        "id": 555561,
        "edi": "5400508495011",
        "variant": 1,
        "store": "01",
        "season": "NOS",
        "brand": "201",
        "detail1": "ABC-123",
        "detail2": "Red t-shirt",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "description": "Red t-shirt short sleeve",
        "description2": "",
        "description3": "",
        "description4": "",
        "description5": "",
        "color": "0800",
        "colorbrand": "R001 - red",
        "sizetable": "12",
        "sizeX": "04",
        "sizeY": "01",
        "sizeXdescription": "L",
        "sizeYdescription": "",
        "stock": 3,
        "backorder": 0,
        "order": 6,
        "delivery": 6,
        "price": 29.95,
        "salesprice": 0,
        "salesdiscount": 0,
        "salesstart": null,
        "salesend": null,
        "discount_date": "2026-09-14",
        "discount_percentage": 0,
        "discount_value": 0,
        "article_discount_allowed": true,
        "article_customer_discount_allowed": true,
        "netto_price": 29.95,
        "vat": 21,
        "category1": "0102",
        "category2": "0245",
        "category3": "",
        "category4": "",
        "category5": "",
        "category6": "",
        "category7": "",
        "online": 1,
        "status": "A",
        "timestamp": "2026-09-12 18:04:11",
        "texts": [
            {
                "type": "SJ",
                "variant": 0,
                "sort": 1,
                "text": "Soft cotton t-shirt with a round neck."
            }
        ],
        "files": [
            {
                "type": "01",
                "variant": 1,
                "sort": 1,
                "file": "555561_01_1.jpg"
            }
        ],
        "related": [
            {
                "related": "55556201"
            }
        ],
        "wash_instructions": [
            1,
            4,
            9
        ]
    }
]
```

##### POST Products/stock_action
`https://api.softtouch.eu/1/accounts/{{accountId}}/products/stock_action`
Books a stock movement for one or more products in one call: a supplier order, a delivery, a stock correction or a manual sale. Every movement is written in the stock history of FasMan with the module, the date and the user you give.

When to use it: from purchasing, warehouse or drop-ship integrations. Typical cases: `order` when a purchase order is sent to the supplier, `delivery` when the goods arrive (with `create_labels` to print the labels in the store), `stock_correction` after a count in an external warehouse, `manual_sale` for sales that are registered outside FasMan and must not create a receipt. Web shops never use it; their sales are receipts or reservations.

 | 

 | name
 | type
 | 

 | action
 | string
 | required: order, delivery, stock_correction or manual_sale

 | products
 | array
 | required, the products and quantities

 | products[].product_uid
 | integer
 | the 14-digit key; or barcode + pos_id

 | products[].barcode
 | string
 | the EAN; requires pos_id

 | products[].pos_id
 | string
 | length 4, the POS whose store is used with a barcode

 | products[].quantity
 | integer
 | required, not 0; negative quantities undo

 | products[].discount, total_price
 | numeric
 | manual_sale only

 | products[].allocation_store
 | string
 | length 2, delivery only: the store the pieces are allocated to

 | date
 | date
 | the date of the movement, default today

 | remark
 | string
 | 

 | user_id
 | string
 | length 4

 | history_module
 | string
 | length 3, the module written in the stock history (see History), default WEB

 | direct_delivery
 | boolean
 | order only: deliver at once

 | is_reorder
 | boolean
 | order only: count as a re-order

 | remove_backorder
 | boolean
 | delivery only: clear the remaining backorder

 | allow_insufficient_backorder
 | boolean
 | delivery only: deliver more than was ordered

 | create_labels
 | boolean
 | delivery only: print labels for the delivered pieces

 | allocate_delivery
 | boolean
 | delivery only: allocate the delivery to customer orders

 | transfer_delivery
 | boolean
 | delivery only: create transfers for pieces allocated to other stores

 | stock_correction_id
 | string
 | length 2, stock_correction only: the correction category

 | ignore_check
 | boolean
 | stock_correction only: skip the plausibility check

The response is the list of updated products.

The categories for `stock_correction_id` are listed by Stock correction categories.
Request body:
```
{
    "action": "delivery",
    "date": "2026-09-14",
    "remark": "Delivery note 4471",
    "create_labels": true,
    "products": [
        {
            "product_uid": 55556101040101,
            "quantity": 4
        },
        {
            "barcode": "5400508495004",
            "pos_id": "0101",
            "quantity": 2
        }
    ]
}
```
Example response `Products/stock_action` (200):
```json
[
    {
        "key": 55556101040101,
        "id": 555561,
        "edi": "5400508495011",
        "variant": 1,
        "store": "01",
        "season": "NOS",
        "brand": "201",
        "detail1": "ABC-123",
        "detail2": "Red t-shirt",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "description": "Red t-shirt short sleeve",
        "description2": "",
        "description3": "",
        "description4": "",
        "description5": "",
        "color": "0800",
        "colorbrand": "R001 - red",
        "sizetable": "12",
        "sizeX": "04",
        "sizeY": "01",
        "sizeXdescription": "L",
        "sizeYdescription": "",
        "stock": 7,
        "backorder": 0,
        "order": 6,
        "delivery": 10,
        "price": 29.95,
        "salesprice": 0,
        "salesdiscount": 0,
        "salesstart": null,
        "salesend": null,
        "discount_date": "2026-09-14",
        "discount_percentage": 0,
        "discount_value": 0,
        "article_discount_allowed": true,
        "article_customer_discount_allowed": true,
        "netto_price": 29.95,
        "vat": 21,
        "category1": "0102",
        "category2": "0245",
        "category3": "",
        "category4": "",
        "category5": "",
        "category6": "",
        "category7": "",
        "online": 1,
        "status": "A",
        "timestamp": "2026-09-12 18:04:11",
        "texts": [
            {
                "type": "SJ",
                "variant": 0,
                "sort": 1,
                "text": "Soft cotton t-shirt with a round neck."
            }
        ],
        "files": [
            {
                "type": "01",
                "variant": 1,
                "sort": 1,
                "file": "555561_01_1.jpg"
            }
        ],
        "related": [
            {
                "related": "55556201"
            }
        ],
        "wash_instructions": [
            1,
            4,
            9
        ]
    },
    {
        "key": 55556101030101,
        "id": 555561,
        "edi": "5400508495004",
        "variant": 1,
        "store": "01",
        "season": "NOS",
        "brand": "201",
        "detail1": "ABC-123",
        "detail2": "Red t-shirt",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "description": "Red t-shirt short sleeve",
        "description2": "",
        "description3": "",
        "description4": "",
        "description5": "",
        "color": "0800",
        "colorbrand": "R001 - red",
        "sizetable": "12",
        "sizeX": "03",
        "sizeY": "01",
        "sizeXdescription": "M",
        "sizeYdescription": "",
        "stock": 2,
        "backorder": 0,
        "order": 2,
        "delivery": 2,
        "price": 29.95,
        "salesprice": 0,
        "salesdiscount": 0,
        "salesstart": null,
        "salesend": null,
        "discount_date": "2026-09-14",
        "discount_percentage": 0,
        "discount_value": 0,
        "article_discount_allowed": true,
        "article_customer_discount_allowed": true,
        "netto_price": 29.95,
        "vat": 21,
        "category1": "0102",
        "category2": "0245",
        "category3": "",
        "category4": "",
        "category5": "",
        "category6": "",
        "category7": "",
        "online": 1,
        "status": "A",
        "timestamp": "2026-09-12 18:04:11",
        "texts": [
            {
                "type": "SJ",
                "variant": 0,
                "sort": 1,
                "text": "Soft cotton t-shirt with a round neck."
            }
        ],
        "files": [
            {
                "type": "01",
                "variant": 1,
                "sort": 1,
                "file": "555561_01_1.jpg"
            }
        ],
        "related": [
            {
                "related": "55556201"
            }
        ],
        "wash_instructions": [
            1,
            4,
            9
        ]
    }
]
```

### V1 / Product memos
#### Introduction

A product memo is a short free text that FasMan attaches to an article. There are two kinds:

 | 

 | type
 | Name in FasMan
 | Purpose

 | 30000
 | Office memo
 | an internal note for the back office, for example "supplier delivers in 3 weeks"

 | 30001
 | Sales memo
 | a note that pops up at the point of sale when the article is scanned, for example "do not give discount". A sales memo is only shown between `valid_from` and `valid_until`.

A memo belongs to an article (`product_id`, the six-digit article id) and either to one variant (`product_variant` 1 – 99, the colour) or to all variants (`product_variant` 0). There can be only one memo per article, variant and type: creating a second one for the same combination results in an error, use PATCH instead.

Web shops mostly read memos; writing them is useful for integrations that want to warn the sales people about an article, for example an EDI or supplier integration that knows a delivery is late.

##### GET Product_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_memos`
Lists product memos. Without filters every memo of the database is returned. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Useful when the web shop wants to show internal remarks of the shop to the staff (an office memo such as delivery delayed), or when an integration synchronises FasMan memos to another system. Web shops that only sell do not need this call.

 | 

 | name
 | type
 | 

 | product_id
 | integer
 | 6 digits (100000 – 999999)

 | product_variant
 | integer
 | 0 – 99, 0 = memo for all variants

 | type
 | string
 | 30000 (office memo) or 30001 (sales memo)

 | valid_at
 | date
 | YYYY-MM-DD, only memos whose validity period includes this date

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the memo

- product_id: the article id (6 digits)

- product_variant: the variant (colour) the memo applies to, 0 for all variants

- type: 30000 or 30001

- memo: the text

- valid_from, valid_until: validity period; only meaningful for sales memos (30001)
Example response `Product_memos` (200):
```json
[
    {
        "id": 22001,
        "product_id": 236812,
        "product_variant": 1,
        "type": "30000",
        "memo": "Supplier delivers in 3 weeks",
        "valid_from": "2000-01-01",
        "valid_until": "2000-01-01"
    },
    {
        "id": 22002,
        "product_id": 236812,
        "product_variant": 1,
        "type": "30001",
        "memo": "No discount on this article",
        "valid_from": "2026-06-15",
        "valid_until": "2026-12-31"
    }
]
```

##### GET Product_memos/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_memos/1`
Fetches one product memo by its id. The return values are the same as in the list call. A `400` error with Product Memo model {id} not found is returned for an unknown id.

When to use it: Use it to re-read a memo you created earlier, for example before updating it.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | display
 | string
 | full
Example response `Product_memos/{{id}}` (200):
```json
{
    "id": 22002,
    "product_id": 236812,
    "product_variant": 1,
    "type": "30001",
    "memo": "No discount on this article",
    "valid_from": "2026-06-15",
    "valid_until": "2026-12-31"
}
```

##### POST Product_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_memos`
Creates a product memo. The article (and, when `product_variant` is not 0, the variant) must exist, and there may not be a memo yet for the same article, variant and type.

When to use it: Use it from an integration that knows something the sales people should see when they scan the article: a supplier feed that reports a recall or a delayed delivery (sales memo, 30001, shown at the POS), or a purchasing system that stores order remarks (office memo, 30000).

 | 

 | name
 | type
 | 

 | product_id
 | integer
 | required, 6 digits

 | product_variant
 | integer
 | required, 0 – 99; 0 = all variants

 | type
 | string
 | required, 30000 (office memo) or 30001 (sales memo)

 | memo
 | string
 | required, the text

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

 | valid_from
 | date
 | YYYY-MM-DD, required for type 30001

 | valid_until
 | date
 | YYYY-MM-DD, required for type 30001 and later than valid_from

The response is the created memo. Errors: Product model … not found, Product Memo model … already exists, User model … not found and Parameter valid_from should be less than parameter valid_until.
Request body:
```
{
    "product_id": 123456,
    "product_variant": 1,
    "type": "30001",
    "memo": "Memo text",
    "user_id": "1001",
    "valid_from": "2026-09-01",
    "valid_until": "2026-12-31"
}
```
Example response `Product_memos` (200):
```json
{
    "id": 22016,
    "product_id": 123456,
    "product_variant": 1,
    "type": "30001",
    "memo": "Memo text",
    "valid_from": "2026-09-01",
    "valid_until": "2026-12-31"
}
```

##### PATCH Product_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_memos/1`
Updates the text and, for sales memos, the validity period of an existing memo. The article, variant and type of a memo cannot be changed; delete the memo and create a new one instead.

When to use it: Use it to change the text or extend the validity of a memo your integration created, for example when the expected delivery date shifts.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | memo
 | string
 | the new text

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

 | valid_from
 | date
 | YYYY-MM-DD, only used for type 30001

 | valid_until
 | date
 | YYYY-MM-DD, only used for type 30001 and later than valid_from

The response is the updated memo.
Request body:
```
{
    "memo": "Updated memo text",
    "user_id": "1001",
    "valid_from": "2026-09-01",
    "valid_until": "2027-01-31"
}
```
Example response `Product_memos` (200):
```json
{
    "id": 22016,
    "product_id": 123456,
    "product_variant": 1,
    "type": "30001",
    "memo": "Updated memo text",
    "valid_from": "2026-09-01",
    "valid_until": "2027-01-31"
}
```

##### DELETE Product_memos
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_memos/1`
Deletes a product memo. The response is `true` when the memo was deleted; an unknown id results in a `400` error.

When to use it: Use it when the reason for the memo no longer exists, for example when the delayed delivery has arrived. Sales memos also stop showing automatically after `valid_until`, so deleting them is optional.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Product_memos` (200):
```json
true
```

### V1 / Product wash and care instructions
#### Introduction

Wash and care instructions are the symbols found on the label of a garment: wash at 30 °C, do not bleach, iron at low temperature, and so on. FasMan keeps a master list of these instructions (with titles in three languages and an icon) and links them to articles. This endpoint returns those links, so a web shop can show the care symbols of a product.

The master list itself, with the titles, descriptions and icon file names, is available in API version 2 under Wash_instructions. Combine both: fetch the master list once, fetch the links for the products you display and look up the details by `wash_and_care_instruction_id`.

A link belongs to an article (`barbody`, the six-digit article id) and either to one variant (`barbodycolor`, the eight-digit article id + variant) or to all variants (`color` 0). Links are maintained in FasMan or, for brands that publish their care instructions, filled from supplier data.

##### GET Product_wash_instructions
`https://api.softtouch.eu/1/accounts/{{accountId}}/product_wash_instructions`
Lists the wash and care instructions linked to articles. Filter on one or more articles to get the instructions of the products you display. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Use it when the product page of the web shop shows the care symbols of a garment. Call it during the product synchronisation with the article ids of the batch you are processing, and combine the ids with the master list from Wash_instructions (v2) for the titles and icons.

 | 

 | name
 | type
 | 

 | barbody
 | string
 | comma separated list of article ids (6 digits each)

 | barbodycolors
 | string
 | comma separated list of article id + variant (8 digits each, e.g. 23684201)

 | wash_and_care_instruction_id
 | integer
 | only links to this instruction

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- barbodycolor: the article id followed by the variant (8 digits); the variant part is 00 when the instruction applies to all variants

- barbody: the article id (6 digits), only with display full

- color: the variant, 0 for all variants, only with display full

- wash_and_care_instruction_id: the id of the instruction, see Wash_instructions in API v2 for the title and icon

- created_at, updated_at, deleted_at: timestamps, only with display full
Example response `Product_wash_instructions` (200):
```json
[
    {
        "barbodycolor": "17467200",
        "wash_and_care_instruction_id": 7
    },
    {
        "barbodycolor": "17467200",
        "wash_and_care_instruction_id": 15
    },
    {
        "barbodycolor": "17467200",
        "wash_and_care_instruction_id": 20
    }
]
```
Example response `Product_wash_instructions (display=full)` (200):
```json
[
    {
        "barbodycolor": "17467200",
        "barbody": 174672,
        "color": 0,
        "wash_and_care_instruction_id": 7,
        "created_at": "2020-12-11 12:53:43",
        "updated_at": "2020-12-11 12:53:43",
        "deleted_at": null
    }
]
```

### V1 / Program variables
#### Introduction

Program variables are the settings of the FasMan point of sale and back office: how many copies of an invoice are printed, which POS prints transfer tickets, whether cheques may receive a discount, and hundreds of others. A web shop or integration rarely needs to change them, but reading them explains why the API behaves as it does for a particular client. A few examples referred to elsewhere in this documentation:

- `TransferPrintTicketDefaultPOSID`: where a transfer ticket is printed (see Transfer).

- the variables that decide whether items with discount count for the customer card (see Receipts).

#### Levels

A variable can be set on three levels. The `code` of a record shows the level:

 | 

 | code
 | group
 | Level

 | 0000
 | 1
 | company wide (the default)

 | 00 + store id, e.g. 0002
 | 2
 | one store

 | POS id, e.g. 0201
 | 3
 | one point of sale

The most specific level wins: a value set for the POS overrules the store value, which overrules the company value. The list call therefore always works for a location. When no `store_id` and `pos_id` are given, the default store and POS of the account are used.

Program variables are read-only through the API.

Two variables matter for web shops in particular: `WebshopPickupConfirmURL` and `WebshopDeliveryConfirmURL`, the URLs MyFasMan Mobile calls (GET, with `reservationId=<id>` appended) when a web shop order is confirmed as ready for pick-up or shipped. See the Receipts folder, Web shop orders, for how to use them.

##### GET Prog_variables
`https://api.softtouch.eu/1/accounts/{{accountId}}/prog_variables`
Lists the program variables for a store and POS. By default all records that apply to the location are returned, so a variable that is set on several levels appears more than once, ordered from the most specific level (POS) to the company level. Add `specific=1` to receive each variable once, with the value that effectively applies to the location. Every name in `ids` must exist: one unknown name makes the whole call fail with a 404 Model not found, so request the variables you need in small, known groups. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Useful when your integration must behave like the FasMan POS of the client: read the variable that decides it instead of hard-coding the client's choice. Examples: the number of days a reservation stays valid, whether cheques may get a discount, or which POS prints transfer tickets. Read the variables once at start-up or once a day; they rarely change.

 | 

 | name
 | type
 | 

 | store_id
 | string
 | length 2; defaults to the default store of the account

 | pos_id
 | string
 | length 4; defaults to the default POS of the account

 | ids
 | string
 | comma separated list of variable names, e.g. AantalFacturen,TransferPrintTicketDefaultPOSID

 | specific
 | boolean
 | 1 = one record per variable with the effective value for the location

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the name of the variable

- code: the level the record is set on (0000 = company, 00 + store id = store, POS id = POS)

- group: 1 (company), 2 (store) or 3 (POS)

- value: the value as text; interpret it according to type

- value_blob: large values such as layouts or lists, usually null

- description: what the variable does

- type: Integer, Text, Boolean, Double, Date, …

- category, sub_category: the group the variable belongs to in the FasMan settings screen, e.g. SALES / INVOICE

- min_value, max_value: the allowed range for numeric variables
Example response `Prog_variables` (200):
```json
[
    {
        "key": "AantalFacturen",
        "code": "0000",
        "group": "1",
        "value": "2",
        "value_blob": null,
        "description": "THE NUMBER OF INVOICE TICKETS TO PRINT",
        "type": "Integer",
        "category": "SALES",
        "sub_category": "INVOICE",
        "min_value": "0",
        "max_value": "999"
    },
    {
        "key": "TransferPrintTicketDefaultPOSID",
        "code": "0000",
        "group": "1",
        "value": "0000",
        "value_blob": null,
        "description": "SET THE DEFAULT POS ID TO PRINT A TRANSFER TICKET (FFFF = PRINT IN THE RECEIVING WAREHOUSE)",
        "type": "Text",
        "category": "SALES",
        "sub_category": "ARTICLE",
        "min_value": "0",
        "max_value": "4"
    }
]
```

### V1 / Reservations
#### Introduction

A reservation is an order that is not paid in the store yet: the articles are reserved for the customer, the stock is reduced, and the store finishes the sale later, at the point of sale or by processing the reservation through the API. For a web shop it is the natural way to register an order that the store still has to prepare: create the reservation with all its items in one call, let the store pick and ship, and process it (turn it into a receipt) once the parcel leaves or the customer collects.

Reservation numbers start with 999 (999100000 … 999999999). A reservation belongs to the store of the API account unless `store_id` says otherwise.

#### A basic example

Result:

#### Items, prices and vouchers

- The API is strict: a `customer_id` or `product_uid` that does not exist, or an address that does not belong to the customer, results in an error.

- Send only the `product_uid` and `quantity` and the API takes the current price, including the discounts that apply on that day. Send `discount` (a percentage), `price_to_pay` (the line total) or `net_price` (the unit price) when the web shop decides the price, for example for the sale types of Stock sale v2, and then also send the matching `discount_type_id`.

- The item description is generated by FasMan; only override it with `description` for a good reason.

- A gift voucher the customer buys is an item with the cheque number as `product_uid` and a positive quantity; a voucher the customer uses is the same item with a negative quantity. Validate the cheque first (see Cheques).

- Whenever an `invoice_address_id` is set, `invoice_required` becomes true.

- `art_external_order_status` (28000 … 28099) marks a line that a drop-ship supplier will deliver; see Supplier_data in API version 2.

#### Letting the store know

A reservation does not print by itself. After creating it, send a message with subject PRINT RESERVATION and the reservation number as message (see Messages), or a push notification to MyFasMan Mobile (App_notification), so the store starts preparing the order. Create Customer order statuses for the lines when the client follows web orders in FasMan's order overview.

##### GET Reservations
`https://api.softtouch.eu/1/accounts/{{accountId}}/reservations/999100002`
Fetches one reservation by its number when an id is given in the URL, or lists the reservations of the account without it. Like every list call, the list is limited to 500 records per call.

When to use it: to show a customer the state of an order, to check whether the store processed a reservation (`processed`), or to find open reservations (`is_processed=0`) for a follow-up job.

 | 

 | name
 | type
 | 

 | id
 | integer
 | in the URL, the reservation number (999100000 … 999999999)

 | is_processed
 | boolean
 | list only: processed or open reservations

 | remarks
 | string
 | list only: reservations whose remarks contain this text

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the reservation number

- label_barcode: the number printed as barcode on the reservation ticket

- store_id: the store of the reservation

- customer_id, invoice_address_id, delivery_address_id, giftlist_id: the customer and the addresses or gift list the reservation refers to

- invoice_required: an invoice is expected

- discount: total discount

- price_to_pay: total to pay

- processed: the reservation has been turned into a receipt

- payment_id: the payment reference given when the reservation was created

- items: the lines, each with key (line number), product_uid, quantity, unit_price, discount, price_to_pay, discount_type_id, description, customer_order_status and remarks

With `display=full` the reservation also returns tracking_number, remarks, oss_country_code, pickup_date, due, paid, balance and payment_type_10.
Example response `Reservations/{{id}}` (200):
```json
{
    "key": 999100002,
    "label_barcode": 9991000020,
    "store_id": "01",
    "customer_id": 2,
    "invoice_address_id": 4,
    "delivery_address_id": 6,
    "giftlist_id": 1,
    "invoice_required": true,
    "discount": 50,
    "price_to_pay": 175,
    "processed": false,
    "payment_id": "",
    "items": [
        {
            "key": 1,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 50,
            "price_to_pay": 50,
            "discount_type_id": 99999908000002,
            "description": "This is a test.",
            "customer_order_status": 31001,
            "remarks": ""
        },
        {
            "key": 2,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 75,
            "price_to_pay": 25,
            "discount_type_id": 0,
            "description": "Red t-shirt [ABC-123] L",
            "customer_order_status": null,
            "remarks": ""
        },
        {
            "key": 3,
            "product_uid": 55559001030301,
            "quantity": 2,
            "unit_price": 50,
            "discount": 0,
            "price_to_pay": 100,
            "discount_type_id": 0,
            "description": "Blue t-shirt [ABC-124] M",
            "customer_order_status": null,
            "remarks": ""
        }
    ]
}
```

##### POST Reservations
`https://api.softtouch.eu/1/accounts/{{accountId}}/reservations`
Creates a reservation with all its items in one call. The stock of the reserved products is reduced immediately.

When to use it: when a web shop order is placed and the store still has to prepare it. Create the customer and the delivery address first, validate any vouchers, then create the reservation, then notify the store (see the folder description).

 | 

 | name
 | type
 | 

 | customer_id
 | integer
 | required

 | payment_type
 | integer
 | 1 … 30, the payment type in FasMan; 1 is always cash, the others are configured per client. It has no effect on the sale itself and can be ignored unless the client asks for it

 | payment_id
 | string
 | max. 255, the reference of the payment in the web shop (PSP transaction id)

 | invoice_address_id
 | integer
 | one of the invoice addresses of the customer; sets invoice_required

 | delivery_address_id
 | integer
 | one of the delivery addresses of the customer

 | giftlist_id
 | integer
 | the gift list the articles are bought from

 | store_id
 | string
 | length 2, default the store of the API account

 | pos_id
 | string
 | length 4

 | remarks
 | string
 | free text, printed on the reservation ticket

 | tracking_number
 | string
 | max. 255, when the parcel is already booked

 | items
 | array
 | required

 | items[].product_uid
 | integer
 | required, the 14-digit product key, or a cheque number

 | items[].quantity
 | integer
 | default 1; negative for a voucher that is used

 | items[].discount
 | numeric
 | discount percentage

 | items[].price_to_pay
 | numeric
 | the line total, when the web shop sets the price

 | items[].net_price
 | numeric
 | the unit price, when the web shop sets the price

 | items[].discount_type_id
 | integer
 | 99999908000000 … 99999908999999, see Discount types

 | items[].description
 | string
 | overrides the generated description

 | items[].vat_percentage
 | integer
 | 

 | items[].art_external_order_status
 | integer
 | 28000 … 28099, drop-ship line

 | display
 | string
 | full

The response is the created reservation with its items and totals; keep the `key`, it is the reservation number you need to process it and to print it.
Request body:
```
{
    "customer_id": 2,
    "delivery_address_id": 6,
    "invoice_address_id": 4,
    "payment_type": 9,
    "giftlist_id": 1,
    "store_id": "01",
    "pos_id": "0101",
    "remarks": "This is a remark.",
    "items": [
        {
            "product_uid": "55559002030201",
            "quantity": 1,
            "discount": 50.00,
            "discount_type_id": 99999908000002,
            "description": "This is a test.",
            "vat_percentage": 21,
            "art_external_order_status": 28001
        },
        {
            "product_uid": "55559002030201",
            "quantity": 1,
            "price_to_pay": 25
        },
        {
            "product_uid": "55559001030301",
            "quantity": 2,
            "net_price": 50
        }
    ]
}
```
Example response `Reservations` (200):
```json
{
    "key": 999100002,
    "label_barcode": 9991000020,
    "store_id": "01",
    "customer_id": 2,
    "invoice_address_id": 4,
    "delivery_address_id": 6,
    "giftlist_id": 1,
    "invoice_required": true,
    "discount": 50,
    "price_to_pay": 175,
    "processed": false,
    "payment_id": "",
    "items": [
        {
            "key": 1,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 50,
            "price_to_pay": 50,
            "discount_type_id": 99999908000002,
            "description": "This is a test.",
            "customer_order_status": 31001,
            "remarks": ""
        },
        {
            "key": 2,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 75,
            "price_to_pay": 25,
            "discount_type_id": 0,
            "description": "Red t-shirt [ABC-123] L",
            "customer_order_status": null,
            "remarks": ""
        },
        {
            "key": 3,
            "product_uid": 55559001030301,
            "quantity": 2,
            "unit_price": 50,
            "discount": 0,
            "price_to_pay": 100,
            "discount_type_id": 0,
            "description": "Blue t-shirt [ABC-124] M",
            "customer_order_status": null,
            "remarks": ""
        }
    ]
}
```

##### POST Reservations/process
`https://api.softtouch.eu/1/accounts/{{accountId}}/reservations/999100002/process?payment_type=9`
Processes a reservation: the sale is finalised in FasMan (a receipt is created for the reservation) with the given payment type. A processed reservation cannot be changed anymore.

When to use it: when the order is paid and the goods leave the store, if the client wants the web shop to close the sale instead of the sales person at the point of sale. Many clients prefer to process reservations themselves in FasMan; agree it with the client.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the reservation number

 | payment_type
 | integer
 | required, 1 … 30, the payment type in FasMan (1 = cash; ask the client which id represents the online payment)

 | display
 | string
 | full

The response is the processed reservation (`processed: true`).
Example response `Reservations/{{id}}/process` (200):
```json
{
    "key": 999100002,
    "label_barcode": 9991000020,
    "store_id": "01",
    "customer_id": 2,
    "invoice_address_id": 4,
    "delivery_address_id": 6,
    "giftlist_id": 1,
    "invoice_required": true,
    "discount": 50,
    "price_to_pay": 175,
    "processed": true,
    "payment_id": "",
    "items": [
        {
            "key": 1,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 50,
            "price_to_pay": 50,
            "discount_type_id": 99999908000002,
            "description": "This is a test.",
            "customer_order_status": 31001,
            "remarks": ""
        },
        {
            "key": 2,
            "product_uid": 55559002030201,
            "quantity": 1,
            "unit_price": 100,
            "discount": 75,
            "price_to_pay": 25,
            "discount_type_id": 0,
            "description": "Red t-shirt [ABC-123] L",
            "customer_order_status": null,
            "remarks": ""
        },
        {
            "key": 3,
            "product_uid": 55559001030301,
            "quantity": 2,
            "unit_price": 50,
            "discount": 0,
            "price_to_pay": 100,
            "discount_type_id": 0,
            "description": "Blue t-shirt [ABC-124] M",
            "customer_order_status": null,
            "remarks": ""
        }
    ]
}
```

### V1 / Receipts
#### Introduction

A receipt (a kasticket in FasMan) is a sale. Where a reservation only sets articles aside for a customer, a receipt takes them out of stock, registers the payment, updates the customer card and the revenue, and is final: a processed receipt can only be corrected by a new receipt that does the opposite.

Most web shops are better served by reservations: the goods stay in stock and visible to the sales people until the parcel really leaves the shop, and the store processes the reservation into a receipt at the point of sale, including the customer card logic. Receipts are the right choice when the web shop must handle the customer card discount itself, or when the sale is final at the moment the order is placed. Talk to your client about how their customer cards work before you start.

A receipt is built from three parts:

- general information: store, POS, customer, addresses, totals, remarks;

- an array of payments;

- an array of items: products, cheques, tailoring and miscellaneous articles.

The output adds the customer card situation, the cheques the customer receives, and an invoice when one was requested.

#### Work in two calls

The API generates lines you did not send: customer discounts, automatic article discounts, vouchers for a negative total. The `price_to_pay` of the receipt can therefore differ from what you calculated. Always:

- POST the receipt without `process` to get the totals (and the customer card situation);

- let the customer pay that amount;

- POST the receipt again with `payment` and `process: true`.

In rare cases the payment method influences the customer card; a second unprocessed call with the payment array then shows the final situation.

Treat the unprocessed call as your price engine: it applies the customer card discount, the direct discount of privileged customers, the sale periods and the vouchers exactly as the POS would, so you do not have to rebuild those rules. In the result, the customer discount is the line with `product_uid` 99999999999999 (negative `price_to_pay`), voucher lines have a uid starting with 999902 to 999909 (the type is the first 8 digits), and every other line keeps the uid you sent. When the customer pays online, run the unprocessed call once more right before you process: a customer card that changed in between (a purchase in the store) changes the total, and a `payment` that no longer matches is refused. If that happens after the customer paid, process with `generate_customer_discount: false`, so the discount is kept for the next visit and the paid amount matches.

#### Stores and points of sale

All items of one receipt are sold from the same store. Each account has a default store and POS, which is what most web shops need. When only `store_id` is given, the POS becomes the first POS of that store (store id + 01). The last two digits of every `product_uid` in the output are the store the item was sold from, whatever store the input uid pointed to. Selling an article that is not in stock in that store is allowed and results in a negative stock; use the Messages endpoint to warn the store (subject PRINT TICKET prints the receipt on the POS).

#### Quantities, discounts and prices

Keep it simple: send the `product_uid` and, if needed, either a `discount` or a `price_to_pay`. Both are totals for the line, so multiply them by the `quantity`. A negative quantity returns an article. The API refuses a discount or price that exceeds the unit price times the quantity, and refuses a discount on items that do not allow one (`item_discount_allowed` in the output). A discount of 0 overrules an automatic discount. Items may get a `discount_type_id` (99999908000000 – 99999908999999, see Discount types); when you send none, the API sets a default where applicable. `force_unit_price_calculation` recalculates the unit price from quantity, discount and price to pay; only use it with the approval of your client.

#### Special items

 | 

 | product_uid
 | Item

 | 14 digits, ending in the store id
 | a stock article

 | 99999901xxxxxx
 | a tailoring; add `price_to_pay`, `description` and `ready_date` for custom work

 | 99999902xxxxxx … 99999909xxxxxx
 | an existing cheque; quantity 1 = the customer receives it, quantity -1 + `checksum` = the customer uses it

 | 999902, 999903, 999904, 999905, 999909, 999701
 | an anonymous cheque of that type created on the fly; `price_to_pay` is required and is the value of the cheque

 | 99999999999995
 | a miscellaneous article, e.g. shipping cost; add `price_to_pay` and `description`

 | 99999999999999
 | customer discount, generated by the API, never sent

Cheques the customer receives are listed in the `cheques` array of the output; once the receipt is processed they carry their final key, checksum and barcode.

#### Payment

`payment` is an array with one object whose keys are the payment types of the account (1 is always cash, the others are configured per client, up to 30) and whose values are the amounts. The sum must equal `price_to_pay`, or an error is returned. Payment is required when processing. `price_paid` can be higher than the total when the customer pays cash and gets change. `rounding` adds the cash rounding applied at the POS.

#### Customer cards

The customer card discount is calculated by the API when a `customer_id` is given: a discount line, a customer card cheque or a direct discount, depending on the card type of the client. The `customer_card` array in the output shows the situation after the receipt: saved `discount`, `lines`, `frequency` (visits) and `points`. Per item, `on_customer_card` and `customer_card_value` show whether and for how much the item counts. `generate_customer_discount: false` postpones the discount, `no_direct_discount: false` skips the privileged direct discount of the customer, and `on_customer_card` / `customer_card_percentage` on an item overrule the defaults. Never change a customer card situation yourself.

#### Invoices

`create_invoice: true` creates an invoice when the receipt is processed. A `customer_id` is required; the invoice address is taken from the customer's invoice address (or `invoice_address_id` when the customer has several), falling back to the customer details. The invoice, with net amounts, VAT, gross total and the structured communication, is returned in the `invoice` array.

#### Web shop conventions

Conventions that SoftTouch's own web shop uses and that the stores recognise:

- Shipping costs and add-ons (gift wrapping, a donation) are lines on the miscellaneous article `99999999999995` with `price_to_pay` and a `description`. Some clients have a real shipping article; check with `products?uid=` that it exists before using it.

- Quantities the supplier ships (drop-ship, see Supplier_data in version 2) are a second line with the same `product_uid`, the supplier quantity and `art_external_order_status: 28002`; the store's own quantity stays on the first line.

- Digital gift vouchers the customer buys are sold on a separate receipt (items with product_uid 999902 and the value as `price_to_pay`, `webshop_order_processed: true`), so the physical order stays a clean pick list; the created vouchers come back in `cheques`, with the checksum and barcode to print on the PDF.

- Guest checkout books the order on one general customer of the client (often called Webshop), with the real name in `remarks` and the delivery address created under that customer.

- After the order is created: generate the transfer requests (Transfer_request_headers/generate in version 2) or split the lines (split_lines) when a quantity is above 1, then send the print message and the App_notification.

- Resilience: the API only reduces stock when the receipt or reservation is created, so hold the stock locally while the customer pays. When the API answers 500 or with an unreadable body, keep the order locally and retry it every minute; the customer has paid, the store must get the order.

#### Web shop orders

`is_webshop_order: true` marks the receipt as a web shop order. From that moment the order is visible to the store in three places:

- In FasMan, in the order overview, where each item gets a customer order status (see Customer order statuses): to pick up or to despatch, to confirm, confirmed, processed.

- In MyFasMan Mobile (Android and iOS), in the web shop module: the staff sees the new orders on the device, picks the articles with the scanner and marks the lines as handled. Send an App_notification (API version 2) right after creating the receipt, so the device is alerted at once.

- In MySoftTouch, the back office, where the client follows the web shop orders and creates the shipping labels.

Shipping from the SoftTouch side. The web shop does not need its own shipping integration. In MySoftTouch the store creates the shipping label for a web shop order with the carrier the client has connected: bpost directly, MyParcel / SendMyParcel (bpost, PostNL, DHL, DPD) or Sendcloud. Shipping options such as signature, insurance, Saturday or evening delivery and return labels are chosen there. Pick-up points are supported too: a bpost point or parcel locker, or a MyParcel pick-up point, chosen in the web shop and stored on the delivery address (`pickup_id`, `pickup_type`). When the label is created, SoftTouch writes the tracking number on the receipt and marks the order as processed; for MyParcel and Sendcloud the delivery status is synchronised afterwards. The customer receives the track-and-trace link from the carrier, and the receipt keeps it for the web shop's my orders page.

Shipping from the web shop side. When the web shop or an external warehouse ships the parcel itself, set `tracking_number`, `remark` and `webshop_order_processed: true` with PATCH when the parcel leaves, so the store sees the order as done and the customer can follow the parcel.

What the SoftTouch shipping needs from the order. The label is made from the data on the receipt, so the web shop has to deliver it complete:

- A `delivery_address_id` when the parcel goes to another address than the customer's own. Without it, the customer record itself is used (name, company, address, postal code, city, country). Create the address with Delivery addresses first and refer to it on the receipt; use `surname` for the recipient's name and `name` for the company.

- A complete address: street with house number, postal code, city and the ISO country code. The house number is split off automatically, so keep it in the street field.

- An e-mail address and a mobile number on the delivery address or the customer: the carrier uses them for the track-and-trace notifications, and some carriers refuse a label without a phone number.

- For pick-up points: `pickup_id` and `pickup_type` on the delivery address. The web shop must offer the pick-up points of the same provider the client uses on the SoftTouch side (bpost, or MyParcel with its carrier), fetched from that provider's own API, so the id you store is the one the label request expects. `pickup_type` tells which kind of point it is: 42500 home delivery, 42501 to 42505 the bpost point types (post office, post point, parcel locker, shop, Kariboo), 42601 a MyParcel pick-up point, 42602 a MyParcel parcel locker. Agree the provider with the client before you build the pick-up point selection.

Telling the web shop that the order is ready. Two program variables (see Program variables) let the store notify the web shop without any polling: `WebshopPickupConfirmURL` and `WebshopDeliveryConfirmURL`. When they are set, MyFasMan Mobile calls the URL with a plain GET the moment the staff confirms the order in the web shop module: the pick-up URL for orders the customer collects, the delivery URL for orders that are shipped. The order id is appended as `reservationId=<id>` (the reservation number or the receipt number, whichever the order was created as), so end your URL with `?` or `&`, for example `https://shop.example.com/api/order-ready?token=abc&`. Your endpoint can then e-mail the customer that the order is ready for pick-up, or that it has been shipped. The variables are set by SoftTouch or the client in the program variables of FasMan; ask the client to configure them and confirm the URLs with you.

##### GET Receipts
`https://api.softtouch.eu/1/accounts/{{accountId}}/receipts`
Lists receipts. Always filter: a shop easily has hundreds of thousands of receipts. The result is limited to 100 receipts per call; use `take` and `skip` to page. Items are included in every receipt.

When to use it: Use it for reporting and reconciliation rather than for the sales flow: export the receipts of a day or a period to an accounting or BI system (`date_period`), find the receipts of one customer for a my purchases page (`customer_ids`), or find back the web shop orders you created (`is_webshop_order`, `tracking_number`).

 | 

 | name
 | type
 | 

 | date_period
 | string
 | two dates separated by a comma, YYYY-MM-DD,YYYY-MM-DD

 | receipt_id_range
 | string
 | two receipt ids separated by a comma

 | customer_ids
 | string
 | comma separated customer ids

 | store_ids
 | string
 | comma separated store ids (2 characters each)

 | pos_ids
 | string
 | comma separated POS ids (4 characters each)

 | product_uids
 | string
 | comma separated product uids (14 digits each); receipts containing one of these products

 | tracking_number
 | string
 | receipts with this tracking number

 | remark
 | string
 | receipts whose remark contains this text

 | is_webshop_order
 | boolean
 | only web shop orders

 | display
 | string
 | full

 | take
 | integer
 | max. 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the receipt number (10 digits)

- label_barcode: the barcode printed on the receipt

- store_id, pos_id: where the receipt was made

- date, time: when the receipt was made

- customer_id, invoice_address_id, delivery_address_id: the customer and addresses; 0 when none

- discount: the total discount of the receipt

- price_to_pay: the total of the receipt

- items: the receipt lines (key, user_sold_id, product_uid, quantity, unit_price, discount, price_to_pay, discount_type_id, description, vat_percentage, customer_order_status, remarks)

With `display=full` the receipt also contains price_paid, tracking_number, remark, payment (the payment array), payment_id, is_webshop_order and webshop_order_processed.
Example response `Receipts` (200):
```json
[
    {
        "key": 1000242943,
        "label_barcode": "0100024294304",
        "store_id": "01",
        "pos_id": "0101",
        "date": "2026-08-03",
        "time": "14:08",
        "customer_id": 10,
        "invoice_address_id": 0,
        "delivery_address_id": 0,
        "discount": 0,
        "price_to_pay": 10,
        "items": [
            {
                "key": 1,
                "user_sold_id": "",
                "product_uid": 99999999999995,
                "quantity": 1,
                "unit_price": 10,
                "discount": 0,
                "price_to_pay": 10,
                "discount_type_id": 0,
                "description": "Divers artikel",
                "vat_percentage": 21,
                "customer_order_status": null,
                "remarks": ""
            }
        ]
    }
]
```

##### GET Receipts/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/receipts/2000158889`
Fetches one receipt by its receipt number, including its items. The return values are the same as in the list call; add `display=full` for the payment array, price paid, tracking number, remark and web shop flags.

When to use it: Use it to show a customer the detail of a purchase, or to check the state of a web shop order you created earlier (with `display=full` you get the tracking number and the processed flags).

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, the receipt number (10 digits)

 | display
 | string
 | full
Example response `Receipts/{{id}} (display=full)` (200):
```json
{
    "key": 1000242943,
    "label_barcode": "0100024294304",
    "store_id": "01",
    "pos_id": "0101",
    "date": "2026-08-03",
    "time": "14:08",
    "customer_id": 10,
    "invoice_address_id": 0,
    "delivery_address_id": 0,
    "discount": 0,
    "price_to_pay": 10,
    "price_paid": 10,
    "tracking_number": "",
    "remark": "",
    "payment": [
        {
            "1": 10
        }
    ],
    "payment_id": "",
    "is_webshop_order": false,
    "webshop_order_processed": false,
    "items": [
        {
            "key": 1,
            "user_sold_id": "",
            "product_uid": 99999999999995,
            "quantity": 1,
            "unit_price": 10,
            "discount": 0,
            "price_to_pay": 10,
            "discount_type_id": 0,
            "description": "Divers artikel",
            "vat_percentage": 21,
            "customer_order_status": null,
            "remarks": ""
        }
    ]
}
```

##### POST Receipts
`https://api.softtouch.eu/1/accounts/{{accountId}}/receipts`
Calculates a receipt and, when `process` is true, registers it. Read the folder description first: work in two calls, and expect lines you did not send.

When to use it: Use it when the web shop must register the sale itself instead of leaving that to the store: when the customer card discount has to be calculated and shown at checkout, when an invoice must be created at the moment of the order, or when the client wants every web sale to be a final receipt. For orders the store will still prepare and ship, a reservation is usually the better choice.

Receipt level

 | 

 | name
 | type
 | 

 | items
 | array
 | required, the items (see below)

 | customer_id
 | integer
 | required when create_invoice is true, and for some clients when processing

 | invoice_address_id
 | integer
 | must belong to the customer

 | delivery_address_id
 | integer
 | must belong to the customer; stored for reference only

 | store_id
 | string
 | length 2; defaults to the default store of the account

 | pos_id
 | string
 | length 4; defaults to the default POS

 | user_id
 | string
 | FasMan user id, length 4

 | payment
 | array
 | one object {"1": 40, "3": 17.99}; keys are the payment types (1 = cash, up to 30), values the amounts; required when processing, the sum must equal price_to_pay

 | price_paid
 | numeric
 | what the customer handed over, equal to or higher than the total

 | rounding
 | numeric
 | cash rounding applied at the POS (payments = total + rounding)

 | process
 | boolean
 | true to register the receipt; default false

 | create_invoice
 | boolean
 | create an invoice when processing; requires customer_id

 | generate_customer_discount
 | boolean
 | false postpones the customer discount to a next visit

 | no_direct_discount
 | boolean
 | false skips the direct discount of a privileged customer

 | create_voucher_when_negative
 | boolean
 | false pays a negative total in cash instead of creating a voucher

 | force_unit_price_calculation
 | boolean
 | recalculate the unit price from quantity, discount and price_to_pay

 | apply_vat_exemption
 | boolean
 | sell VAT exempt (export); see vat_exempt in the output

 | ignore_price_check, override_unit_price
 | boolean
 | skip the price validation / use the given unit price; only with the approval of your client

 | is_webshop_order
 | boolean
 | mark as web shop order

 | webshop_order_processed
 | boolean
 | mark the order as already handled

 | online
 | string
 | comma separated web shop channel numbers 0 – 5 the order came from

 | tracking_number
 | string
 | max. 255

 | remark
 | string
 | remark stored with the receipt

 | reservation_id
 | integer
 | the reservation this receipt processes

 | payment_id
 | string
 | reference of the payment provider

Item level

 | 

 | name
 | type
 | 

 | product_uid
 | integer
 | required; a product uid (14 digits), a tailoring or cheque uid, an anonymous cheque type (999902, 999903, 999904, 999905, 999909, 999701) or 99999999999995 for a miscellaneous article

 | quantity
 | integer
 | default 1; negative to return an article or use a cheque

 | discount
 | numeric
 | total discount for the line

 | price_to_pay
 | numeric
 | total for the line; required for anonymous cheques and miscellaneous articles

 | checksum
 | string
 | required when using an existing cheque

 | ready_date
 | date
 | tailoring only, when it will be ready

 | description
 | string
 | overrules the ticket description; for tailoring and miscellaneous articles the description of the item

 | long_description
 | string
 | 

 | discount_type_id
 | integer
 | 99999908000000 – 99999908999999

 | user_sold_id
 | string
 | the FasMan user that sold the item, length 4

 | vat_percentage
 | numeric
 | overrules the VAT of the item; only with good reason

 | on_customer_card
 | boolean
 | force the item to (not) count for the customer card

 | customer_card_percentage
 | numeric
 | percentage of price_to_pay that counts for the customer card

 | art_external_order_status
 | integer
 | 28000 – 28099, supplier drop-ship status of the line (28001 Stockbase, 28002 sent to Stockbase, …)

 | webshop_order_processed
 | boolean
 | 

 | custom_code
 | string
 | only with product_uid 999902

 | remark, memo, remarks
 | string
 | free text stored with the line

Response

The calculated or processed receipt: key (null until processed), label_barcode, store_id, pos_id, customer_id, invoice_address_id, delivery_address_id, discount, price_to_pay, price_paid, rounding, seal (the fiscal seal, only after processing), tracking_number, remark, is_webshop_order, webshop_order_processed, payment, payment_id, customer_card, vat_exempt, items, cheques and invoice. Each item returns key, user_sold_id, product_uid, quantity, unit_price, discount, price_to_pay, discount_type_id, description, ticket_description, exchange_description, vat_percentage, item_discount_allowed, on_customer_card, art_external_order_status, customer_card_value, webshop_order_item_processed and remarks.

Errors are returned as `400` with a list of messages: unknown product uid, customer or address, a discount on an item that does not allow one, a price above the unit price, a payment that does not add up, a used cheque without matching checksum, and so on.
Request body:
```
{
    "customer_id": 500,
    "is_webshop_order": true,
    "process": true,
    "payment": [
        {
            "6": 175
        }
    ],
    "generate_customer_discount": false,
    "items": [
        {
            "product_uid": 25007302060101
        },
        {
            "product_uid": 999902,
            "price_to_pay": 100
        }
    ]
}
```
Example response `Receipts (not processed)` (200):
```json
{
    "key": null,
    "label_barcode": null,
    "store_id": "02",
    "pos_id": "0201",
    "customer_id": 500,
    "invoice_address_id": 0,
    "delivery_address_id": 0,
    "discount": 0,
    "price_to_pay": 65.46,
    "price_paid": 0,
    "rounding": 0,
    "seal": null,
    "tracking_number": "",
    "remark": "",
    "is_webshop_order": false,
    "webshop_order_processed": false,
    "payment": [],
    "payment_id": "",
    "customer_card": [
        {
            "discount": 6.55,
            "lines": 0,
            "frequency": 22,
            "points": 0
        }
    ],
    "vat_exempt": false,
    "items": [
        {
            "key": 1,
            "user_sold_id": "",
            "product_uid": 25007302060102,
            "quantity": 1,
            "unit_price": 75,
            "discount": 0,
            "price_to_pay": 75,
            "discount_type_id": 0,
            "description": "Heren Just B. [TEST JOHN & FRANK/Blauw/Broek met zijzakken] (Size : XXL)",
            "ticket_description": "Heren Just B.",
            "exchange_description": "",
            "vat_percentage": 21,
            "item_discount_allowed": true,
            "on_customer_card": true,
            "art_external_order_status": "",
            "customer_card_value": 7.5,
            "webshop_order_item_processed": false,
            "remarks": ""
        },
        {
            "key": 2,
            "user_sold_id": "",
            "product_uid": 99999999999999,
            "quantity": -1,
            "unit_price": 9.54,
            "discount": 0,
            "price_to_pay": -9.54,
            "discount_type_id": 0,
            "description": "Klantenkorting",
            "ticket_description": "Klantenkorting",
            "exchange_description": "",
            "vat_percentage": 21,
            "item_discount_allowed": false,
            "on_customer_card": true,
            "art_external_order_status": "",
            "customer_card_value": -0.95,
            "webshop_order_item_processed": false,
            "remarks": ""
        }
    ],
    "cheques": [],
    "invoice": []
}
```
Example response `Receipts (processed)` (200):
```json
{
    "key": 2010000564,
    "label_barcode": "0201000056406",
    "store_id": "02",
    "pos_id": "0201",
    "customer_id": 500,
    "invoice_address_id": 0,
    "delivery_address_id": 0,
    "discount": 0,
    "price_to_pay": 175,
    "price_paid": 175,
    "rounding": 0,
    "seal": "80539066",
    "tracking_number": "",
    "remark": "",
    "is_webshop_order": true,
    "webshop_order_processed": false,
    "payment": [
        {
            "6": 175
        }
    ],
    "payment_id": "",
    "customer_card": [
        {
            "discount": 79.54,
            "lines": 0,
            "frequency": 25,
            "points": 0
        }
    ],
    "vat_exempt": false,
    "items": [
        {
            "key": 1,
            "user_sold_id": "",
            "product_uid": 25007302060102,
            "quantity": 1,
            "unit_price": 75,
            "discount": 0,
            "price_to_pay": 75,
            "discount_type_id": 0,
            "description": "Heren Just B. [TEST JOHN & FRANK/Blauw/Broek met zijzakken] (Size : XXL)",
            "ticket_description": "Heren Just B.",
            "exchange_description": "",
            "vat_percentage": 21,
            "item_discount_allowed": true,
            "on_customer_card": true,
            "art_external_order_status": "",
            "customer_card_value": 7.5,
            "webshop_order_item_processed": false,
            "remarks": ""
        },
        {
            "key": 2,
            "user_sold_id": "",
            "product_uid": 99999902007055,
            "quantity": 1,
            "unit_price": 100,
            "discount": 0,
            "price_to_pay": 100,
            "discount_type_id": 0,
            "description": "Cadeaucheque [007055]",
            "ticket_description": "Cadeaucheque [007055]",
            "exchange_description": "",
            "vat_percentage": 21,
            "item_discount_allowed": true,
            "on_customer_card": true,
            "art_external_order_status": "",
            "customer_card_value": 10,
            "webshop_order_item_processed": false,
            "remarks": ""
        }
    ],
    "cheques": [
        {
            "key": 99999902007055,
            "id": 999902,
            "customer": "500",
            "checksum": "e5140615",
            "value": 100,
            "description": "Cadeaucheque [007055]",
            "fromdate": "2026-09-14",
            "todate": "2027-09-14",
            "claimed": false,
            "label_barcode": "9999020070555",
            "customer_card_value": 0,
            "one_scan_per_customer": false
        }
    ],
    "invoice": []
}
```

##### PATCH Receipts
`https://api.softtouch.eu/1/accounts/{{accountId}}/receipts/2000158889`
Updates the few fields of a receipt that may change after it was processed. Typically used by a web shop when the parcel is shipped: set the tracking number and mark the order as processed.

When to use it: Use it when the parcel of a web shop order leaves: set the `tracking_number` and mark the order as processed, so the store sees in FasMan that the order is done and the customer can follow the parcel.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the receipt number

 | tracking_number
 | string
 | max. 255

 | remark
 | string
 | 

 | webshop_order_processed
 | boolean
 | true marks the lines (and the receipt, when all lines are done) as processed

 | assigned_to
 | string
 | store id (max. 4 characters); with webshop_order_processed only the lines assigned to this store are marked, lines that were not available (status 31107) in that store are released again

 | procedure
 | string
 | name of a client specific stored procedure to run after processing; only on request of SoftTouch

The response is the updated receipt with `display=full` fields.
Request body:
```
{
    "tracking_number": "EX47868BA4",
    "remark": "You can update the remark here.",
    "webshop_order_processed": true
}
```
Example response `Receipts` (200):
```json
{
    "key": 2000158889,
    "label_barcode": "0200015888909",
    "store_id": "02",
    "pos_id": "0201",
    "date": "2026-09-10",
    "time": "11:42",
    "customer_id": 500,
    "invoice_address_id": 0,
    "delivery_address_id": 0,
    "discount": 0,
    "price_to_pay": 75,
    "price_paid": 75,
    "tracking_number": "EX47868BA4",
    "remark": "You can update the remark here.",
    "payment": [
        {
            "6": 75
        }
    ],
    "payment_id": "",
    "is_webshop_order": true,
    "webshop_order_processed": true,
    "items": [
        {
            "key": 1,
            "user_sold_id": "",
            "product_uid": 25007302060102,
            "quantity": 1,
            "unit_price": 75,
            "discount": 0,
            "price_to_pay": 75,
            "discount_type_id": 0,
            "description": "Heren Just B. [TEST JOHN & FRANK/Blauw/Broek met zijzakken] (Size : XXL)",
            "vat_percentage": 21,
            "customer_order_status": {
                "id": 140,
                "status_id": "31108",
                "type_id": "31001"
            },
            "remarks": ""
        }
    ]
}
```

### V1 / Seasons
#### Introduction

Seasons group the collections in time: Winter 2026, Summer 2027. Their three-character id is chosen by the client (`W26`, `S27` or numeric ids such as `126` and `127` that sort chronologically). Articles that do not belong to a season, such as basics that are always in stock, use a never out of stock season, often `NOS` or `999`. Every product refers to a season.

##### GET Seasons
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons?display=full`
Lists all seasons. Like every list call, the result is limited to 500 records per call.

When to use it: during the nightly synchronisation, before the products, to translate the season of a product and to build season filters or a "new collection" page (`web_visible`). Cache the result.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier (3 characters), used as `season` in products, e.g. W26 for Winter 2026

- description: the description, e.g. Winter 2026

- detail1 … detail5: free fields for client specific information

- active: whether the season can be assigned to new products

- visible: whether the season is shown in FasMan

With `display=full` the season also returns:

- from_date, to_date: the period of the season

- lang1 … lang5: the description per language, `null` when not set

- web_visible: whether the season is visible in the web shop
Example response `Seasons` (200):
```json
[
    {
        "id": "999",
        "description": "Doorlopend/NOS",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "W19",
        "description": "Winter 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W20",
        "description": "Winter 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W21",
        "description": "Winter 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W22",
        "description": "Winter 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W23",
        "description": "Winter 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W24",
        "description": "Winter 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "T",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "W25",
        "description": "Winter 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "Z19",
        "description": "Zomer 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z20",
        "description": "Zomer 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z21",
        "description": "Zomer 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z22",
        "description": "Zomer 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z23",
        "description": "Zomer 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "Z24",
        "description": "Zomer 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": true
    },
    {
        "id": "Z25",
        "description": "Zomer 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    }
]
```

##### GET Seasons/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons/Z24`
Fetches one season by its id. The return values are the same as in the list call.

When to use it: when a product refers to a season you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 3

 | display
 | string
 | full
Example response `Seasons/{{id}}` (200):
```json
{
    "id": "Z24",
    "description": "Zomer 2024",
    "detail1": "",
    "detail2": "",
    "detail3": "",
    "detail4": "",
    "detail5": "T",
    "active": false,
    "visible": true
}
```

##### POST Seasons
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons`
Creates a season.

When to use it: from integrations that create articles, when a supplier feed brings articles of a season the client has not created yet. Agree the id convention with the client first.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, length 3

 | description
 | string
 | required

 | detail1 … detail5
 | string
 | 

 | from_date, to_date
 | date
 | YYYY-MM-DD

 | active
 | boolean
 | default true

 | visible
 | boolean
 | default true

 | web_visible
 | boolean
 | 

 | lang1 … lang5
 | string
 | 

The response is the created season.
Request body:
```
{
    "id": "W26",
    "description": "Winter 2026",
    "detail1": "",
    "detail2": "",
    "detail3": "",
    "detail4": "",
    "detail5": "",
    "from_date": "2026-12-01",
    "to_date": "2026-12-31",
    "active": true,
    "visible": true,
    "lang1": "Winter",
    "lang2": "L'hiver",
    "lang3": "Winter",
    "lang4": "Invierno",
    "lang5": "Inverno"
}
```
Example response `Seasons` (200):
```json
{
    "id": "W26",
    "description": "Winter 2026",
    "detail1": "",
    "detail2": "",
    "detail3": "",
    "detail4": "",
    "detail5": "",
    "active": true,
    "visible": true
}
```

##### POST Seasons/bulk_insert
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons/bulk_insert`
Creates up to 500 seasons in one call. With `force_update: true`, seasons whose id already exists are updated instead of rejected.

When to use it: for an initial import, or to create the seasons of a whole year at once.

 | 

 | name
 | type
 | 

 | seasons
 | array
 | required, max. 500 entries with the fields of the single POST

 | force_update
 | boolean
 | update existing ids

The response is the list of created (or updated) seasons.
Request body:
```
{
    "seasons": [
    {
        "id": "W19",
        "description": "Winter 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W20",
        "description": "Winter 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W21",
        "description": "Winter 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W22",
        "description": "Winter 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W23",
        "description": "Winter 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W24",
        "description": "Winter 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "T",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "W25",
        "description": "Winter 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "Z19",
        "description": "Zomer 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z20",
        "description": "Zomer 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z21",
        "description": "Zomer 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z22",
        "description": "Zomer 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z23",
        "description": "Zomer 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "Z24",
        "description": "Zomer 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": true
    },
    {
        "id": "Z25",
        "description": "Zomer 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    }
    ],
    "force_update": true
    
}
```
Example response `Seasons/bulk_insert` (200):
```json
[
    {
        "id": "W19",
        "description": "Winter 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W20",
        "description": "Winter 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W21",
        "description": "Winter 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "W22",
        "description": "Winter 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W23",
        "description": "Winter 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "W24",
        "description": "Winter 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "T",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "W25",
        "description": "Winter 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    },
    {
        "id": "Z19",
        "description": "Zomer 2019",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z20",
        "description": "Zomer 2020",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z21",
        "description": "Zomer 2021",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z22",
        "description": "Zomer 2022",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": false,
        "visible": false
    },
    {
        "id": "Z23",
        "description": "Zomer 2023",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": false
    },
    {
        "id": "Z24",
        "description": "Zomer 2024",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "T",
        "active": false,
        "visible": true
    },
    {
        "id": "Z25",
        "description": "Zomer 2025",
        "detail1": "",
        "detail2": "",
        "detail3": "",
        "detail4": "",
        "detail5": "",
        "active": true,
        "visible": true
    }
]
```

##### PATCH Seasons
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons/W26`
Updates a season. Only the parameters that are sent are changed; the id cannot be changed.

When to use it: to set the dates or the web visibility of a season, or to deactivate an old one.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 3

 | detail1 … detail5
 | string
 | 

 | from_date, to_date
 | date
 | YYYY-MM-DD

 | active
 | boolean
 | default true

 | visible
 | boolean
 | default true

 | web_visible
 | boolean
 | 

 | lang1 … lang5
 | string
 | 

The response is the updated season.
Request body:
```
{
    "description": "Winter 2026 Patched",
    "detail1": "",
    "detail2": "",
    "detail3": "",
    "detail4": "",
    "detail5": "",
    "active": true,
    "visible": true
}
```
Example response `Seasons` (200):
```json
{
    "id": "W26",
    "description": "Winter 2026 Patched",
    "detail1": "",
    "detail2": "",
    "detail3": "",
    "detail4": "",
    "detail5": "",
    "active": true,
    "visible": true
}
```

##### DELETE Seasons
`https://api.softtouch.eu/1/accounts/{{accountId}}/seasons/W26`
Deletes a season. The response is `true`. A season that is used by products cannot be deleted; deactivate it instead.

When to use it: to clean up a season your integration created by mistake, before articles refer to it.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 3
Example response `Seasons` (200):
```json
true
```

### V1 / Stock sale v2 (Sale periods)
#### Introduction

FasMan knows two ways to put articles on sale. The first is on product level: the `sales_` fields of a product (a sale price or a percentage between two dates). The second is a sale period: a rule that applies a percentage or price to a selection of articles (stores, seasons, brands, categories, colours) between two dates, with a priority when rules overlap. Sale periods are what the client sets in FasMan for the seasonal sales and for promotions such as "buy 2, get 1 free".

The simple sale periods (type 55000) are already applied in the `discount_` fields of the product call and in the price calculation of receipts and reservations. The other types (tying, scale discounts, buy X get Y, tying that ignores article sales) cannot be applied by the API because they depend on what else is in the basket; the web shop applies them itself, as described in the GET call.

##### GET StockSaleV2
`https://api.softtouch.eu/1/accounts/{{accountId}}/stock_sale_v2`
Lists the sale periods. With the `date` parameter only the periods that are active on that date are returned. Like every list call, the result is limited to 500 records per call.

When to use it: when the web shop calculates the prices itself (the sale types 55001 to 55004), or when it wants to show the running promotions: fetch the periods for today once a day, next to the nightly product sync, and cache them.

Keep in mind that there are two ways of managing sales in FasMan: on product level (the `sales_` fields of the product call) and the sale periods returned here.

Used parameters:

- date

- display (full)

- take

- skip

A brief explanation of return values:

- id: The unique ID of the sale period

- description: A short description to describe the sale period

- barcode_activate: not yet implemented

- sales_type: The type of sale being used for this sale period (more information below)

- sales_settings: The settings for a specific sales type (more information below per sales type)

- sales_counter_options: The setting which defines what articles count for a specific sale type (more information below per sales type)

- from_date: The start date of the sale period (this date is inclusive)

- to_date: The end date of the sale period (this date is also inclusive)

- percentage: The percentage in effect for this sale period

- price: The price in effect for this sales period (this overrules percentage)

- product_id: not yet implemented

- product_id2: not yet implemented

- discount_type: The discount type barcode that will be used for this sale period

- store: The stores (comma separated) in which this sale period is applied, % meaning all stores

- season: The seasons (comma separated) in which the sale period is applied, % meaning all seasons

- brand: The brands (comma separated) for which the sale period is applies, % meaning all brands

- brand2: not yet implemented

- category1-7: The categories (comma separated, per group) for which the sale period is applied, % meaning all categories of that group

- color: The colors (comma separated) for which the sale period is applies, % meaning all colors

- online, online2 … online5: whether the sale period applies to the online channel(s) of the client

- description_web_nl, description_web_fr, description_web_en: the description to show in the web shop, per language

- priority: the order in which overlapping sale periods take effect: the lower the number, the higher the priority (priority 1 wins over priority 12). With equal priority the best matching sale period applies.

You may already know from the product call or the receipt call that the API features a lot of functionality regarding sales. Sales on product level, or sale periods with type 55000 are supported by default, both are processed in the product call (with the "discount_" fields) and in the receipt call (when not giving any parameter related to price).

However, the other sale period types are not supported by these calls. Below we go over all sale types and the parameters that matter for each of them.

For the sale types below, manual action is required: the receipt and product calls never change their logic based on them, so the web shop has to calculate the prices itself and send them in the receipt or reservation call.

Put the correct `discount` (or `price_to_pay`) in the item payload of the receipt or reservation call, and add the `discount_type_id` of the sale period to that item. When the `discount_type` of the sale period is 0, leave the `discount_type_id` parameter out.

 | 

 | sales type
 | Rules / description

 | 55000 - Sales
 | This is the basic sale period type, the simplest of all, any article that has this sale type applied will get the percentage or price discount applied. (Automatically applied in product call "discount_" fields, as well as in the receipt call calculations.)

 | 55001 - Tying
 | Articles included in this sales type should get a discount only when purchasing other articles.  
Here the following fields are important:  
  
- sales_settings:  
The number of articles that must be bought for the sale to apply, in our example, 2 articles need to be purchased before 30 % discount can be given (on articles that have the required conditions (the conditions in the example being season = 999 and brand = 005 or 003)).  
  
- sales_counter_options:  
This will define which articles should be counted to hit the condition (in our example the condition being, buy 2 articles to trigger the discount). This will always be one of the following:  
  
1:  
The easiest option: all articles count.  
  
2:  
Only articles that have a discount or are part of tying count.  
This means that any article that does not have any discount on it and also is not part of any sales period using any sale type, will not be counted for the requirement of buying 2 articles (in our example)  
  
3:  
Only articles that are in tying count.  
This means that articles with regular discount are excluded from the count, only articles that fall under tying conditions should be counted for the requirement of buying 2 articles (in our example)

 | 55002 - Scale discounts
 | This sale type is basically the same as 55001 (tying), with the exception that the discount can increase (or technically also decrease) with the amount of articles bought.  
With tying, you can only define x amount of articles before Y percentage discount is applied to those articles.  
With scale discounts, you can apply a different percentage the more you buy, in our example: buying 1 piece = 0%, buying 2 pieces = 20%, buying 3 pieces = 30% and buying 4 or 5 pieces (or more) will give you 50%.  
  
This means that the "sales_counter_options" value is also the same as with the sale type 55001 (tying), however "sales_settings" changes a little bit.  
It now holds semicolon separated values, one per quantity.  
"0;20;30;50;50" is our example, and the impact of these values are described above.

 | 55003 - Buy X, get Y for free
 | When using this sale type, the following fields are important:  
  
- sales_settings:  
two semicolon separated values, the first value is the amount of articles that need to be bought in order to trigger the requirement, the 2nd value is the amount of articles you get for free when buying this amount of articles. in our example you will see "2;1", meaning you buy 2, you get 1 for free.  
  
- sales_counter_options:  
1, 2 or 3, these are the same as described in the Tying section (55001), this has impact on which articles get counted for the requirement.  
  
  
A couple of tips / guidelines for this sale type specifically:  
  
- Our way of handling this sale type is by giving the article with the lowest value of the 3 articles for free. meaning that if article A costs 100 EUR, article B is also 100 EUR, but article C is 50 EUR, article C will be the free one. You are free to discuss with the client how they want to handle this of course, as they may also choose to divide the discount over all 3 articles (meaning 33% discount per article in our example).  
  
- Remember that when you're making receipts, customer card can be calculated depending on how your environment is set up. However, by default you should use the parameter "on_customer_card" (value "false" of course) on the item payload of the 2 articles that are part of the action, but don't get the discount. The article that will get the 100% discount does not need this parameter as articles that have a discount don't count for the customer card anyway.  
  
- There is an exception to the rule above: discount_type_id. When using discount_type_id, you do not put the "on_customer_card", but instead just add the "discount_type_id" parameter. This is because discount types can change whether an article with discount has to go on the customer card or not.  
  
- Be careful with a quantity greater than 1. If you're applying a 100% discount in a receipt item where the quantity is 2, you are essentially giving away 2 articles for free, which (unless the requirement hits twice) is not how it should work. In this case you should apply a 50% discount on the line with quantity 2 (if this is the line you need to apply the sale on to begin with).

 | 55004 - Tying (Ignore article sales)
 | This is basically the same as tying, with one big caveat.  
The discount percentage is the sales_percentage defined on product level, this means that any article that fulfills the requirements to be part of this sale type should NOT get the discount by default, but should instead get it only when the tying condition has been fulfilled.  
The sales_counter_options and sales_settings values have the same impact as sale type 55001 (tying), so please consult above for more information if you haven't already.
Example response `StockSaleV2` (None):
```json
[
    {
        "id": 1,
        "description": "Buy X get Y for free",
        "barcode_activate": "",
        "sales_type": "55003",
        "sales_settings": "2;1",
        "sales_counter_options": 1,
        "from_date": "2024-11-01",
        "to_date": "2024-11-30",
        "percenatage": 0,
        "percentage": 0,
        "price": 0,
        "product_id": 0,
        "product_id2": 0,
        "discount_type": 0,
        "store": "%",
        "season": "%",
        "brand": ",006,001",
        "brand2": "%",
        "category1": "%",
        "category2": "%",
        "category3": "%",
        "category4": "%",
        "category5": "%",
        "category6": "%",
        "category7": "%",
        "color": "%",
        "online": true,
        "online2": true,
        "online3": true,
        "online4": true,
        "online5": true
    },
    {
        "id": 2,
        "description": "Tying",
        "barcode_activate": "",
        "sales_type": "55001",
        "sales_settings": "2",
        "sales_counter_options": 1,
        "from_date": "2024-12-01",
        "to_date": "2024-12-15",
        "percenatage": 30,
        "percentage": 30,
        "price": 0,
        "product_id": 0,
        "product_id2": 0,
        "discount_type": 0,
        "store": "%",
        "season": ",999",
        "brand": ",005,003",
        "brand2": "%",
        "category1": "%",
        "category2": "%",
        "category3": "%",
        "category4": "%",
        "category5": "%",
        "category6": "%",
        "category7": "%",
        "color": "%",
        "online": true,
        "online2": true,
        "online3": true,
        "online4": true,
        "online5": true
    }
]
```

### V1 / Stock correction categories
#### Introduction

Stock correction categories are the reasons a client defines for correcting stock outside sales and deliveries: does not exist, stolen, damaged, counted. Every stock correction in FasMan carries one, and the Products/stock_action call with action `stock_correction` expects its id in `stock_correction_id`. The id has two characters.

##### GET Stock_correction_categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/stock_correction_categories`
Lists the stock correction categories of the client. Like every list call, the result is limited to 500 records per call.

When to use it: once, when you set up a stock integration, to agree with the client which category your corrections should carry; then cache the list.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier (2 characters), used as `stock_correction_id` in Products/stock_action

- description: the reason

- active (display=full): whether the category can still be used
Example response `Stock_correction_categories` (200):
```json
[
    {
        "id": "01",
        "description": "Does not exist"
    },
    {
        "id": "02",
        "description": "Stolen"
    }
]
```

##### GET Stock_correction_categories/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/stock_correction_categories/01`
Fetches one stock correction category by its id. Unknown ids return a 400 error with Stock Correction Category model … not found.

When to use it: to translate the id of a correction you receive from FasMan into its reason.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, length 2

 | display
 | string
 | full
Example response `Stock_correction_categories/{{id}}` (200):
```json
{
    "id": "01",
    "description": "Does not exist",
    "active": true
}
```

### V1 / Stores
#### Introduction

A store is a physical shop, a warehouse or a virtual store (the web shop itself is often a store of its own). Its id has two characters, always numeric, and it is the last part of the 14-digit product key: every product exists per store. Receipts, reservations, transfers, customers and cheques refer to a store, and each store belongs to a corporation (see Corporations).

##### GET Stores
`https://api.softtouch.eu/1/accounts/{{accountId}}/stores?display=full`
Lists all stores. Like every list call, the result is limited to 500 records per call.

When to use it: at the start of the integration and in the nightly synchronisation: to know which store ids exist, which one is the web shop or the shipping warehouse, and to show store names for pick-up in store. Cache the result.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the unique identifier (2 characters)

- txt: the name of the store

- sort: the sort order in which stores are displayed

- active: whether the store is in use

With `display=full` the store also returns:

- customer_card_group: the customer card group of the store, when the client keeps a card per store group

- corporation_id: the corporation the store belongs to

- gln: Global Location Number, when available

- surface: surface area in square metres

- rent: rent of the store

- value1, value2, status1, status2: free fields

- region: the region of the store

- color: the colour of the store in FasMan screens

- shipping_name, shipping_company, shipping_street_name, shipping_street_number, shipping_zip, shipping_city, shipping_country_iso, shipping_email, shipping_phone: the shipping address and contact of the store, used by the shipping integrations and for pick-up in store

- must_use_transfer_code: transfers to this store must be received with a transfer code
Example response `Stores` (200):
```json
[
    {
        "key": "01",
        "txt": "Magazijn",
        "sort": 1,
        "active": "T"
    },
    {
        "key": "02",
        "txt": "Lochristi",
        "sort": 2,
        "active": "T"
    },
    {
        "key": "03",
        "txt": "Destelbergen",
        "sort": 3,
        "active": "T"
    },
    {
        "key": "04",
        "txt": "Gent",
        "sort": 4,
        "active": "T"
    }
]
```

### V1 / Size tables
#### Introduction

Every product refers to a size table (`sizetable` in the product, two characters). The size table lists the sizes an article can have and, for two-dimensional tables such as jeans with a length or bras with a cup, the second dimension. The Products chapter explains how a product refers to a position in its size table: `sizeX` is the position in the first dimension and `sizeY` the position in the second one, both counted from 01. One-dimensional tables have a single Y position.

A size table has:

- a `key` of two characters, assigned by FasMan when it is created;

- a `txt`, the description shown in FasMan;

- `sizeX`, the ordered list of sizes of the first dimension (max. 99);

- `sizeY`, the ordered list of the second dimension (max. 99), or one dummy entry for one-dimensional tables;

- `active` and `priority`, which decide whether and where it appears in the FasMan pick lists.

Sizes are identified by their position, not by their text: position 4 in a table 36-38-40-42 is size 42. Because product keys embed those positions, existing sizes of a table that is already used by products cannot be changed. Adding sizes at the end is always allowed.

##### GET Sizetables
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables`
Lists all size tables with their sizes. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Use it during the product synchronisation, before the products: a web shop needs the size tables to translate the `sizeX`/`sizeY` positions of a product into size names, and to build size filters. Cache the result; size tables change rarely.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- key: the two-character id of the size table, used as sizetable in products

- txt: the description

- active: whether the table can be chosen in FasMan

- priority: sort order in the FasMan pick lists

- sizeX: the sizes of the first dimension, each with its position (pos, counted from 1) and text (txt)

- sizeY: the sizes of the second dimension; a one-dimensional table returns one entry
Example response `Sizetables` (200):
```json
[
    {
        "key": "02",
        "txt": "Dames jeansmaten 23-38 met lengte",
        "active": true,
        "priority": 0,
        "sizeX": [
            {
                "pos": 1,
                "txt": "23"
            },
            {
                "pos": 2,
                "txt": "24"
            },
            {
                "pos": 3,
                "txt": "25"
            },
            {
                "pos": 4,
                "txt": "26"
            }
        ],
        "sizeY": [
            {
                "pos": 1,
                "txt": "L30"
            },
            {
                "pos": 2,
                "txt": "L32"
            },
            {
                "pos": 3,
                "txt": "L34"
            }
        ]
    },
    {
        "key": "48",
        "txt": "S-M-L / 0-1",
        "active": true,
        "priority": 1,
        "sizeX": [
            {
                "pos": 1,
                "txt": "S"
            },
            {
                "pos": 2,
                "txt": "M"
            },
            {
                "pos": 3,
                "txt": "L"
            }
        ],
        "sizeY": [
            {
                "pos": 1,
                "txt": "0"
            },
            {
                "pos": 2,
                "txt": "1"
            }
        ]
    }
]
```

##### GET Sizetables/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables/12`
Fetches one size table by its key. The return values are the same as in the list call.

When to use it: Use it when a product refers to a size table you have not cached yet.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, the two-character key

 | display
 | string
 | full
Example response `Sizetables/{{id}}` (200):
```json
{
    "key": "48",
    "txt": "S-M-L / 0-1",
    "active": true,
    "priority": 1,
    "sizeX": [
        {
            "pos": 1,
            "txt": "S"
        },
        {
            "pos": 2,
            "txt": "M"
        },
        {
            "pos": 3,
            "txt": "L"
        }
    ],
    "sizeY": [
        {
            "pos": 1,
            "txt": "0"
        },
        {
            "pos": 2,
            "txt": "1"
        }
    ]
}
```

##### POST Sizetables
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables`
Creates a size table. The key is assigned by FasMan and returned in the response. Sizes get their position from the order in the array: the first entry of `sizeX` becomes position 1, and so on. The `id` inside a size is optional and ignored on creation.

When to use it: Only needed by integrations that create articles (the article creation calls are documented in a separate, non-public manual): an article must refer to an existing size table, so a supplier or PIM integration creates the missing ones first. Check the existing tables before creating a new one; FasMan users prefer a small, clean list.

 | 

 | name
 | type
 | 

 | txt
 | string
 | required, the description

 | active
 | boolean
 | default true

 | priority
 | integer
 | sort order in FasMan

 | sizeX
 | array
 | required, max. 99 entries of {id, txt}, in the order of the sizes

 | sizeY
 | array
 | max. 99 entries of {id, txt}; leave out for a one-dimensional table

The response is the created size table, with the same fields as the list call.
Request body:
```
{
    "txt": "S-M-L / 0-1",
    "active": 1,
    "priority": 1,
    "sizeX": [
        {
            "id": 1,
            "txt": "S"
        },
        {
            "id": 2,
            "txt": "M"
        },
        {
            "id": 3,
            "txt": "L"
        }
    ],
    "sizeY": [
        {
            "id": 1,
            "txt": "0"
        },
        {
            "id": 2,
            "txt": "1"
        }
    ]
}
```
Example response `Sizetables` (200):
```json
{
    "key": "48",
    "txt": "S-M-L / 0-1",
    "active": true,
    "priority": 1,
    "sizeX": [
        {
            "pos": 1,
            "txt": "S"
        },
        {
            "pos": 2,
            "txt": "M"
        },
        {
            "pos": 3,
            "txt": "L"
        }
    ],
    "sizeY": [
        {
            "pos": 1,
            "txt": "0"
        },
        {
            "pos": 2,
            "txt": "1"
        }
    ]
}
```

##### POST Sizetables/bulk_insert
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables/bulk_insert?sizetables`
Creates up to 500 size tables in one call. Each entry has the same parameters as the single POST; the response is the list of created tables, in the same order.

When to use it: Use it instead of the single POST when an initial import brings many size tables at once, for example when a client migrates from another system.

 | 

 | name
 | type
 | 

 | sizetables
 | array
 | required, max. 500 entries

 | sizetables[].txt
 | string
 | required

 | sizetables[].active
 | boolean
 | 

 | sizetables[].priority
 | integer
 | 

 | sizetables[].sizeX
 | array
 | required, max. 99 entries of {id, txt}

 | sizetables[].sizeY
 | array
 | max. 99 entries of {id, txt}
Request body:
```
{
    "sizetables": [
        {
            "txt": "S-M-L / 0-1 (1)",
            "active": 1,
            "priority": 1,
            "sizeX": [
                {
                    "id": 1,
                    "txt": "S"
                },
                {
                    "id": 2,
                    "txt": "M"
                },
                {
                    "id": 3,
                    "txt": "L"
                }
            ],
            "sizeY": [
                {
                    "id": 1,
                    "txt": "0"
                },
                {
                    "id": 2,
                    "txt": "1"
                }
            ]
        },
        {
            "txt": "S-M-L / 0-1 (2)",
            "active": 1,
            "priority": 1,
            "sizeX": [
                {
                    "id": 1,
                    "txt": "S"
                },
                {
                    "id": 2,
                    "txt": "M"
                },
                {
                    "id": 3,
                    "txt": "L"
                }
            ],
            "sizeY": [
                {
                    "id": 1,
                    "txt": "0"
                },
                {
                    "id": 2,
                    "txt": "1"
                }
            ]
        },
        {
            "txt": "S-M-L / 0-1 (3)",
            "active": 1,
            "priority": 1,
            "sizeX": [
                {
                    "id": 1,
                    "txt": "S"
                },
                {
                    "id": 2,
                    "txt": "M"
                },
                {
                    "id": 3,
                    "txt": "L"
                }
            ],
            "sizeY": [
                {
                    "id": 1,
                    "txt": "0"
                },
                {
                    "id": 2,
                    "txt": "1"
                }
            ]
        }
    ]
}
```
Example response `Sizetables/bulk_insert` (200):
```json
[
    {
        "key": "49",
        "txt": "S-M-L / 0-1 (1)",
        "active": true,
        "priority": 1,
        "sizeX": [
            {
                "pos": 1,
                "txt": "S"
            },
            {
                "pos": 2,
                "txt": "M"
            },
            {
                "pos": 3,
                "txt": "L"
            }
        ],
        "sizeY": [
            {
                "pos": 1,
                "txt": "0"
            },
            {
                "pos": 2,
                "txt": "1"
            }
        ]
    },
    {
        "key": "50",
        "txt": "S-M-L / 0-1 (2)",
        "active": true,
        "priority": 1,
        "sizeX": [
            {
                "pos": 1,
                "txt": "S"
            },
            {
                "pos": 2,
                "txt": "M"
            },
            {
                "pos": 3,
                "txt": "L"
            }
        ],
        "sizeY": [
            {
                "pos": 1,
                "txt": "0"
            },
            {
                "pos": 2,
                "txt": "1"
            }
        ]
    }
]
```

##### PATCH Sizetables
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables/48`
Updates a size table. The description, active flag and priority can always be changed. Sizes can be added at the end by sending entries without `id`; they get the next position. Sizes can be changed by sending entries with the `id` of an existing size (its position), but only when no product uses the size table yet and the FasMan database is version 283 or higher. Sizes cannot be removed.

When to use it: Use it to add a size that a supplier introduced (a new size at the end of the range) or to correct the description. Changing existing sizes is only possible while no article uses the table.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, the two-character key

 | txt
 | string
 | 

 | active
 | boolean
 | 

 | priority
 | integer
 | 

 | sizeX
 | array
 | max. 99 entries of {id, txt}

 | sizeY
 | array
 | max. 99 entries of {id, txt}

The response is the updated size table. Errors: Size table is in use. Cannot change existing sizes. and The DB needs an update to make changes to the sizes.
Request body:
```
{
    "txt": "S-M-L-XL / 0-1",
    "active": 1,
    "priority": 1,
    "sizeX": [
        {
            "txt": "XL"
        }
    ]
}
```
Example response `Sizetables` (200):
```json
{
    "key": "48",
    "txt": "S-M-L / 0-1",
    "active": true,
    "priority": 1,
    "sizeX": [
        {
            "pos": 1,
            "txt": "S"
        },
        {
            "pos": 2,
            "txt": "M"
        },
        {
            "pos": 3,
            "txt": "L"
        },
        {
            "pos": 4,
            "txt": "XL"
        }
    ],
    "sizeY": [
        {
            "pos": 1,
            "txt": "0"
        },
        {
            "pos": 2,
            "txt": "1"
        }
    ]
}
```

##### DELETE Sizetables
`https://api.softtouch.eu/1/accounts/{{accountId}}/sizetables/12`
Deletes a size table and its sizes. A size table that is in use by products cannot be deleted. The response is `true` when the table was deleted.

When to use it: Use it to clean up a size table your integration created by mistake, before articles refer to it.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, the two-character key
Example response `Sizetables` (200):
```json
true
```

### V1 / Transfers
#### Introduction

A transfer moves stock from one store to another. It has two steps, mirroring what happens physically:

- Send: the sending store packs the goods. The quantities leave the stock of the sending store and are counted as in transfer. A transfer ticket can be printed.

- Receive: the receiving store checks the parcel and books the goods into its own stock.

Until the receive step the items are in neither store; FasMan shows them as pending transfers. A transfer can also be created in one go with `direct_transfer`: the stock then moves immediately from the sending to the receiving store, without a pending transfer. Use that for corrections and for integrations that know the goods are already there.

Transfers are often the answer to a transfer request (see Transfer requests): a store asks another store for an article a customer ordered, the other store sends it with a transfer that refers to the request. Each transfer item can carry a customer order status, which links it to the web shop order it fulfils.

A transfer is identified by its number (10 digits, starting with 20) and consists of lines with a product uid, a quantity and an optional remark. Product uids are the 14-digit product keys; the last two digits should be the sending store. Optionally a line refers to a `unique_product_id` (a serial-numbered piece) and a `transfer_category_id` (the reason of the transfer, see Transfer categories; requires FasMan database version 314).

This endpoint requires FasMan database version 290 or higher.

##### GET Transfer
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer`
Lists transfers with their items, newest first. Like every list call, the result is limited to 500 records per call (100 for receipts). Use `take` and `skip` to page through larger sets.

When to use it: Use it to show the sending or receiving store what is on its way, or to reconcile stock movements between stores in a warehouse management system.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the transfer number

- date: the date the transfer was sent

- from_store_id, to_store_id: the sending and receiving store

- remark: remark on the transfer

- items: the lines, each with id (the transfer item id, used to receive), line, product_uid, quantity, remark and customer_order_status (the linked web shop order status, or null)

With `display=full` the transfer also returns pos_id_send, pos_id_received, user_id_send, user_id_received, customer_id and transfer_request_id, and each item adds unique_product_id, transfer_category_id, date, to_store_id, pos_id_received, user_id_received, processed (true once received) and updated_at.
Example response `Transfer` (200):
```json
[
    {
        "id": 2011022421,
        "date": "2026-03-04",
        "from_store_id": "01",
        "to_store_id": "04",
        "remark": "This is a remark.",
        "items": [
            {
                "id": 61003,
                "line": 1,
                "product_uid": 55563101020101,
                "quantity": 1,
                "remark": "This is the remark for the item.",
                "customer_order_status": null
            },
            {
                "id": 61004,
                "line": 2,
                "product_uid": 55563101050101,
                "quantity": 1,
                "remark": "",
                "customer_order_status": null
            },
            {
                "id": 61005,
                "line": 3,
                "product_uid": 55563101030101,
                "quantity": 2,
                "remark": "",
                "customer_order_status": null
            }
        ]
    }
]
```
Example response `Transfer (display=full)` (200):
```json
[
    {
        "id": 2011022421,
        "date": "2026-03-04",
        "from_store_id": "01",
        "to_store_id": "04",
        "remark": "This is a remark.",
        "pos_id_send": "0101",
        "pos_id_received": "0000",
        "user_id_send": "1001",
        "user_id_received": "0000",
        "customer_id": 1,
        "transfer_request_id": 0,
        "items": [
            {
                "id": 61003,
                "line": 1,
                "product_uid": 55563101020101,
                "unique_product_id": 0,
                "quantity": 1,
                "remark": "This is the remark for the item.",
                "transfer_category_id": 0,
                "customer_order_status": null,
                "date": "2026-03-04",
                "to_store_id": "04",
                "pos_id_received": "0000",
                "user_id_received": "0000",
                "processed": false,
                "updated_at": "2026-03-04 15:40:34"
            }
        ]
    }
]
```

##### GET Transfer/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer/2006000516`
Fetches one transfer with its items by its transfer number. The return values are the same as in the list call. A `400` error with Transfer model {id} not found is returned for an unknown number.

When to use it: Use it after creating a transfer to get the item ids you need for receive, or to check whether a transfer has been received (`processed` per item with `display=full`).

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, the transfer number

 | display
 | string
 | full
Example response `Transfer/{{id}}` (200):
```json
{
    "id": 2011022421,
    "date": "2026-03-04",
    "from_store_id": "01",
    "to_store_id": "04",
    "remark": "This is a remark.",
    "items": [
        {
            "id": 61003,
            "line": 1,
            "product_uid": 55563101020101,
            "quantity": 1,
            "remark": "This is the remark for the item.",
            "customer_order_status": null
        },
        {
            "id": 61004,
            "line": 2,
            "product_uid": 55563101050101,
            "quantity": 1,
            "remark": "",
            "customer_order_status": null
        },
        {
            "id": 61005,
            "line": 3,
            "product_uid": 55563101030101,
            "quantity": 2,
            "remark": "",
            "customer_order_status": null
        }
    ]
}
```

##### POST Transfer
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer`
Sends a transfer: the quantities leave the stock of `from_store_id` and become in transfer until the receiving store calls receive. With `direct_transfer: true` the stock is moved to `to_store_id` immediately and no pending transfer is created.

When to use it: Use it when goods physically move between stores and the movement is not registered at the POS: a warehouse system that ships a web shop order from the central stock to the pick-up store, or a store that answers a transfer request. Set `direct_transfer` when the goods are already there and only the stock has to follow, for example when correcting a mistake.

 | 

 | name
 | type
 | 

 | from_store_id
 | string
 | required, length 2

 | to_store_id
 | string
 | required, length 2, different from from_store_id

 | items
 | array
 | required

 | items[].product_uid
 | integer
 | required, the 14-digit product key

 | items[].quantity
 | integer
 | min. 1, default 1

 | items[].remark
 | string
 | max. 50

 | items[].unique_product_id
 | integer
 | the serial-numbered piece that is transferred

 | items[].transfer_category_id
 | integer
 | the reason of the transfer (see Transfer categories), FasMan database version 314 or higher

 | remark
 | string
 | max. 50

 | pos_id
 | string
 | length 4, the POS the transfer is sent from

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

 | customer_id
 | integer
 | the customer the goods are for

 | transfer_request_id
 | integer
 | the transfer request this transfer answers

 | history_module
 | string
 | length 3, module code written in the stock history; default ITR

 | print_ticket
 | boolean
 | print a transfer ticket on the POS decided by the program variable TransferPrintTicketDefaultPOSID (0000 = sending store, FFFF = receiving store, otherwise that POS)

 | direct_transfer
 | boolean
 | move the stock immediately, without a pending transfer

 | transfer_id, transfer_line
 | integer
 | add the lines to an existing transfer, starting at this line number; both required together

 | allocated_store_id
 | string
 | length 2; with direct_transfer, register the goods as allocated to this store in the transfer proposals

The response is the created transfer with its items, as in the list call. Product uids that do not exist in the sending store are created from their key first. With `direct_transfer` the response is `{"status": "OK", "id": ...}` instead of the transfer.

Errors are returned as `400`: Models not found with the unknown products, or Invalid quantities when a quantity would make the stock of a unique product negative.
Request body:
```
{
	"from_store_id": "01",
	"to_store_id": "04",
	"remark": "This is a remark.",
	"pos_id": "0101",
	"user_id": "1001",
	"customer_id": 1,
	"history_module": "API",
    "print_ticket": false,
    "direct_transfer": true,
    
	"items": [
        {
            "product_uid": 55563101020101,
            "quantity": 1,
            "remark": "This is the remark for the item."
        },
        {
            "product_uid": 55563101050101,
            "quantity": 1
        },
        {
            "product_uid": 55563101030101,
            "quantity": 2
        }
    ]
}
```
Example response `Transfer` (200):
```json
{
    "id": 2011022421,
    "date": "2026-03-04",
    "from_store_id": "01",
    "to_store_id": "04",
    "remark": "This is a remark.",
    "items": [
        {
            "id": 61003,
            "line": 1,
            "product_uid": 55563101020101,
            "quantity": 1,
            "remark": "This is the remark for the item.",
            "customer_order_status": null
        },
        {
            "id": 61004,
            "line": 2,
            "product_uid": 55563101050101,
            "quantity": 1,
            "remark": "",
            "customer_order_status": null
        },
        {
            "id": 61005,
            "line": 3,
            "product_uid": 55563101030101,
            "quantity": 2,
            "remark": "",
            "customer_order_status": null
        }
    ]
}
```

##### POST Transfer/receive
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer/2006000516/receive`
Receives (a part of) a transfer in the receiving store: the received quantities are booked into the stock of `to_store_id` and the lines are marked as processed. Lines that are not sent stay pending, so a parcel can be received in several steps.

When to use it: Use it when the parcel arrives in the receiving store and the goods are checked, so the stock of that store is correct from that moment. A warehouse system with a scanner typically calls it per received line.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the transfer number

 | to_store_id
 | string
 | required, length 2, the store that receives

 | pos_id
 | string
 | length 4

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

 | history_module
 | string
 | length 3, module code written in the stock history; default ITR

 | items
 | array
 | required

 | items[].id
 | integer
 | required, the transfer item id (the id of the line in the transfer output)

 | items[].quantity
 | integer
 | min. 1; defaults to the sent quantity

The response is the transfer after receiving, with the same fields as the list call; `processed` is true for the received lines (display full). Receiving more than was sent, or a line that was already received, results in a `400` error.
Request body:
```
{
    "to_store_id": "02",
    "pos_id": "0201",
    "user_id": "1001",
    "history_module": "API",
    "items": [
        {
            "id": 61003,
            "quantity": 1
        }
    ]
}
```
Example response `Transfer/receive` (200):
```json
{
    "id": 2011022421,
    "date": "2026-03-04",
    "from_store_id": "01",
    "to_store_id": "02",
    "remark": "This is a remark.",
    "items": [
        {
            "id": 61003,
            "line": 1,
            "product_uid": 55563101020101,
            "quantity": 1,
            "remark": "This is the remark for the item.",
            "customer_order_status": null
        },
        {
            "id": 61004,
            "line": 2,
            "product_uid": 55563101050101,
            "quantity": 1,
            "remark": "",
            "customer_order_status": null
        },
        {
            "id": 61005,
            "line": 3,
            "product_uid": 55563101030101,
            "quantity": 2,
            "remark": "",
            "customer_order_status": null
        }
    ]
}
```

### V1 / Transfer categories
#### Introduction

Transfer categories are the reasons a client defines for moving goods between stores: season change, web shop order, customer request. A transfer in FasMan can carry one, and a category can be limited to certain stores. Descriptions exist in three languages. Requires FasMan database version 314 or higher.

##### GET Transfer_categories
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_categories`
Lists the transfer categories of the client. Like every list call, the result is limited to 500 records per call.

When to use it: when a warehouse integration creates transfers and the client wants them classified; fetch the list once and cache it.

 | 

 | name
 | type
 | 

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier

- description_nl, description_fr, description_en: the reason per language

- store_ids: the stores the category is limited to, as stored (comma separated store ids; `00` means all stores)

- active, created_at, updated_at (display=full)
Example response `Transfer_categories` (200):
```json
[
    {
        "id": 12,
        "description_nl": "Seizoenswissel",
        "description_fr": "Changement de saison",
        "description_en": "Season change",
        "store_ids": "00"
    }
]
```

##### GET Transfer_categories/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_categories/12`
Fetches one transfer category by its id. Unknown ids return a 400 error with Transfer Category model … not found.

When to use it: to translate the category id of a transfer into its description.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL; the API validates it as 2 characters, so ids below 10 cannot be fetched individually (use the list call)

 | display
 | string
 | full
Example response `Transfer_categories/{{id}}` (200):
```json
{
    "id": 12,
    "description_nl": "Seizoenswissel",
    "description_fr": "Changement de saison",
    "description_en": "Season change",
    "store_ids": "00",
    "active": true,
    "created_at": "2024-03-05 09:12:44",
    "updated_at": "2024-03-05 09:12:44"
}
```

### V1 / Transfer requests
#### Introduction

A transfer request is a question from one store to another: "please send me this article". It is the tool for a web shop or a store that sells an article that is not in stock at the location where it has to be handed over or shipped. The store that has the article receives the request in FasMan (and, when the client uses it, as a notification in MyFasMan Mobile), confirms it, and sends the goods with a transfer (see Transfers). The transfer then refers to the request, and the request is closed.

A request has a header and one item per piece:

- the header: the customer, the store that has to send (`from_store_id`), the store that asks and will receive (`to_store_id`), a remark, the status, and the transfer, reservation or receipt it belongs to;

- the items: one line per piece requested, with the product uid, a remark and its own status. When a quantity higher than 1 is requested, one item per piece is created.

#### Statuses

The header and the items each have a five-character status code.

 | 

 | Header status
 | Meaning

 | 24000
 | Requested

 | 24001
 | Printed in the sending store

 | 24002
 | Confirmed

 | 24003
 | Printed in the receiving store

 | 24004
 | Validated

 | 24005
 | Closed

 | 24009
 | Deleted

 | 

 | Item status
 | Meaning

 | 25000
 | Requested

 | 25001
 | Confirmed

 | 25002
 | Not OK (the sending store cannot deliver the piece)

 | 25003
 | OK

 | 25009
 | Deleted

Items that belong to a web shop order also carry a customer order status (see Customer order statuses), returned inside the item, which the store keeps up to date while it handles the order.

Deleted requests are kept (soft delete) and can still be listed with `with_trashed` or `only_trashed`. This endpoint requires FasMan database version 286 or higher.

Version 2 exposes the same data as Transfer_request_headers and Transfer_request_items, with a generate call that creates the requests for a web shop order automatically and a process call for the providing store; prefer those for new integrations.

##### GET Transfer_requests
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_requests`
Lists transfer requests with their items, newest first. Like every list call, the result is limited to 500 records per call; use `take` and `skip` to page.

When to use it: Use it to show the customer or the store what is still pending: open requests for a web shop order, or all requests a store has to answer. Filter the result on `status` client-side; the API returns the newest first.

 | 

 | name
 | type
 | 

 | with_trashed
 | boolean
 | also return deleted requests and deleted items

 | only_trashed
 | boolean
 | only deleted requests

 | display
 | string
 | full

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the request

- customer_id: the customer the article is for, 0 when none

- from_store_id: the store that has to send the article

- to_store_id: the store that asked for it and will receive it

- remark: remark on the request

- status: the header status, see the folder description

- transfer_id: the transfer that answered the request, 0 until the goods were sent

- reservation_id: the reservation or receipt the request belongs to, 0 when none (both are stored in this field)

- items: the requested pieces, each with id, line, product_uid, remark, status and customer_order_status

With `display=full` the request also returns user_create, user_modify, created_at, updated_at and deleted_at, on the header and on each item, and each item adds transfer_request_id.
Example response `Transfer_requests` (200):
```json
[
    {
        "id": 148,
        "customer_id": 5,
        "from_store_id": "03",
        "to_store_id": "01",
        "remark": "",
        "status": "24000",
        "transfer_id": 0,
        "reservation_id": 1000242898,
        "items": [
            {
                "id": 189,
                "line": 1,
                "product_uid": 23684201010103,
                "remark": "",
                "status": "25000",
                "customer_order_status": {
                    "id": 132,
                    "receipt_id": 1000242898,
                    "receipt_line": 1,
                    "reservation_id": null,
                    "reservation_line": null,
                    "transfer_request_id": 148,
                    "transfer_request_item_id": 189,
                    "transfer_id": null,
                    "transfer_item_id": null,
                    "type_id": "31000",
                    "status_id": "31105",
                    "end_point_warehouse_id": "01",
                    "user_create": "1001",
                    "user_modify": "1001",
                    "deleted_at": null,
                    "created_at": "2026-07-23 15:09:44",
                    "updated_at": "2026-07-23 15:09:44"
                }
            }
        ]
    }
]
```
Example response `Transfer_requests (display=full)` (200):
```json
[
    {
        "id": 148,
        "customer_id": 5,
        "from_store_id": "03",
        "to_store_id": "01",
        "remark": "",
        "status": "24000",
        "transfer_id": 0,
        "reservation_id": 1000242898,
        "items": [
            {
                "id": 189,
                "line": 1,
                "product_uid": 23684201010103,
                "remark": "",
                "status": "25000",
                "customer_order_status": {
                    "id": 132,
                    "receipt_id": 1000242898,
                    "receipt_line": 1,
                    "reservation_id": null,
                    "reservation_line": null,
                    "transfer_request_id": 148,
                    "transfer_request_item_id": 189,
                    "transfer_id": null,
                    "transfer_item_id": null,
                    "type_id": "31000",
                    "status_id": "31105",
                    "end_point_warehouse_id": "01",
                    "user_create": "1001",
                    "user_modify": "1001",
                    "deleted_at": null,
                    "created_at": "2026-07-23 15:09:44",
                    "updated_at": "2026-07-23 15:09:44"
                },
                "transfer_request_id": 148,
                "user_create": "1001",
                "user_modify": "1001",
                "deleted_at": null,
                "created_at": "2026-07-23 15:09:44",
                "updated_at": "2026-07-23 15:09:44"
            }
        ],
        "user_create": "1001",
        "user_modify": "1001",
        "deleted_at": null,
        "created_at": "2026-07-23 15:09:44",
        "updated_at": "2026-07-23 15:09:44"
    }
]
```

##### GET Transfer_requests/{{id}}
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_requests/7`
Fetches one transfer request with its items. The return values are the same as in the list call. A `400` error with Transfer Request model {id} not found is returned for an unknown id; add `with_trashed=1` to fetch a deleted request.

When to use it: Use it after creating a request to follow it up: the header status tells you whether the sending store confirmed, `transfer_id` is filled once the goods were sent, and the customer order status inside each item shows where the piece is.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | with_trashed
 | boolean
 | 

 | only_trashed
 | boolean
 | 

 | display
 | string
 | full
Example response `Transfer_requests/{{id}}` (200):
```json
{
    "id": 148,
    "customer_id": 5,
    "from_store_id": "03",
    "to_store_id": "01",
    "remark": "",
    "status": "24000",
    "transfer_id": 0,
    "reservation_id": 1000242898,
    "items": [
        {
            "id": 189,
            "line": 1,
            "product_uid": 23684201010103,
            "remark": "",
            "status": "25000",
            "customer_order_status": {
                "id": 132,
                "receipt_id": 1000242898,
                "receipt_line": 1,
                "reservation_id": null,
                "reservation_line": null,
                "transfer_request_id": 148,
                "transfer_request_item_id": 189,
                "transfer_id": null,
                "transfer_item_id": null,
                "type_id": "31000",
                "status_id": "31105",
                "end_point_warehouse_id": "01",
                "user_create": "1001",
                "user_modify": "1001",
                "deleted_at": null,
                "created_at": "2026-07-23 15:09:44",
                "updated_at": "2026-07-23 15:09:44"
            }
        }
    ]
}
```

##### POST Transfer_requests
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_requests`
To create a transfer request, this endpoint should be used.
If an article is not available in a specific store/location for shipping OR if article pickup is selected but not all articles are available in the selected store, a transfer request should be made.

When to use it: Use it when a web shop order contains an article that is not in stock in the store that prepares the order, but is in another store: the request asks that store to send the piece. Create it right after the order, one request per sending store, with the customer order status lines it belongs to.

Below are the possible parameters:

 | 

 | Name
 | Requirements
 | Description

 | customer_id
 | integer
 | If you are asking a transfer for an article for a specific customer, add the customer_id parameter.

 | from_store_id
 | required, size: 2
 | The store you are asking to transfer an article, the article comes from this store, and will be transfered (if possible) to the to_store.

 | to_store_id
 | required, size: 2
 | The store which will RECEIVE the transfer if it can be sent, this is the store who is asking the question to the from_store.

 | remark
 | string
 | A remark field for the transfer request.

 | user_id
 | size: 4
 | The user who is asking the question, the default is always decided by the API in case you do not add this parameter. (Which under normal circumstances you won't)

 | transfer_id
 | integer, between:1000000000,9999999999
 | Usually this parameter will not be added when creating a transfer request, since this is mostly for when you handle the transfer request.  
When a transfer request is handled, a transfer_id will be added if applicable.

 | reservation_id
 | integer, between:999100000,999199999
 | If you're creating a transfer request for a specific reservation, add the reservation_id here.  
This is highly recommended when the customer uses the SoftTouch web module (order follow up).

 | receipt_id
 | integer
 | If you're creating a transfer request for a specific receipt, add the receipt_id here.  
This is highly recommended when the customer uses the SoftTouch web module (order follow up).

 | items
 | required, array
 | A list of the items you are requesting to be transferred.

 | items:product_uid
 | required, integer, between: 10000000000000,89999999999999
 | The product_uid has to be the full 14 character product_id, the last 2 characters should be the from_store_id.

 | items:remark
 | string
 | A remark on item level specifically.

You can also send a notification to the MyFasMan Mobile app by using the V2/app_notification endpoint (by using the id you get from the response of this request).
Request body:
```
{
    "customer_id": "5",
    "from_store_id": "02",
    "to_store_id": "01",
    "remark": "This is a remark.",
    "user_id": "1001",
    "items": [
        {
            "product_uid": 10000301040101,
            "remark": "This is the remark for the item."
        }
    ]
}
```
Example response `Transfer_requests` (200):
```json
{
    "id": 2,
    "customer_id": 5,
    "from_store_id": "02",
    "to_store_id": "01",
    "remark": "This is a remark.",
    "status": "24000",
    "transfer_id": 0,
    "reservation_id": 0,
    "items": [
        {
            "id": 4,
            "line": 1,
            "product_uid": 10000301040102,
            "remark": "This is the remark for the item.",
            "status": "25000",
            "customer_order_status": null
        }
    ]
}
```

##### PATCH Transfer_requests
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_requests/7`
Updates the status of a transfer request and of its items, and links the request to the transfer or reservation that handles it. This is what the sending store does when it confirms or refuses the request, and what an integration does when it has created the transfer. Only the parameters that are sent are changed.

When to use it: Use it when your side handles the request instead of the store: a warehouse system confirms the items it can deliver (25001) or refuses them (25002), and links the transfer it created (`transfer_id`). Web shops normally only read requests and let the stores handle them in FasMan or MyFasMan Mobile.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | status
 | string
 | length 5, the new header status (24000 – 24009, see the folder description)

 | transfer_id
 | integer
 | 10 digits, the transfer that sends the goods

 | reservation_id
 | integer
 | 999100000 – 999199999

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

 | items
 | array
 | the items to update

 | items[].id
 | integer
 | the item id; send either id or line

 | items[].line
 | integer
 | the line number within the request; send either id or line

 | items[].status
 | string
 | required, length 5, the new item status (25000 – 25009)

Statuses are validated against the code table; unknown items, statuses, transfers or reservations return a `400` error listing the problems. The response is the updated request with its items, as in the list call.
Request body:
```
{
    "status": "24002",
    "user_id": "1001",
    "transfer_id": 2011022421,
    "items": [
        {
            "id": 189,
            "status": "25001"
        }
    ]
}
```
Example response `Transfer_requests` (200):
```json
{
    "id": 148,
    "customer_id": 5,
    "from_store_id": "03",
    "to_store_id": "01",
    "remark": "",
    "status": "24002",
    "transfer_id": 2011022421,
    "reservation_id": 1000242898,
    "items": [
        {
            "id": 189,
            "line": 1,
            "product_uid": 23684201010103,
            "remark": "",
            "status": "25001",
            "customer_order_status": {
                "id": 132,
                "receipt_id": 1000242898,
                "receipt_line": 1,
                "reservation_id": null,
                "reservation_line": null,
                "transfer_request_id": 148,
                "transfer_request_item_id": 189,
                "transfer_id": null,
                "transfer_item_id": null,
                "type_id": "31000",
                "status_id": "31105",
                "end_point_warehouse_id": "01",
                "user_create": "1001",
                "user_modify": "1001",
                "deleted_at": null,
                "created_at": "2026-07-23 15:09:44",
                "updated_at": "2026-07-23 15:09:44"
            }
        }
    ]
}
```

##### DELETE Transfer_requests
`https://api.softtouch.eu/1/accounts/{{accountId}}/transfer_requests/7`
Deletes a transfer request (soft delete: the request keeps existing with a deleted_at date and can be listed with `with_trashed`). The response is `true`; an unknown id results in a `400` error.

When to use it: Use it when the order behind the request was cancelled before the store sent the goods. A request that was already sent should be closed with a status instead of deleted.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Transfer_requests` (200):
```json
true
```

## V2
Version 2 of the API is built up resource by resource, next to version 1. Its URLs have the same shape:

`https://api.softtouch.eu/2/accounts/{{accountId}}/{{endpoint}}`

Version 2 endpoints work a little differently from version 1:

- select replaces `display`: `select=*` returns all fields of the record, `select=*,gift_list_items.*` adds a relation, and a list of field names limits the output to those fields. Each folder lists the relations it supports.

- Lists return 100 records by default; `take` raises that to a maximum of 500 and `skip` skips records.

- Field names are consistent (`store_id`, `customer_id`, `created_at`) and booleans are real booleans.

- Some resources require a minimum FasMan database version; SoftTouch will tell you when a client is not ready for them.

### V2 / Address_lookup
#### Introduction

The address reference table of the client (postal code, city, street), the same list FasMan uses to complete addresses at the point of sale. A web shop can use it to auto-complete an address form with the values the stores use. It is a plain search on the client's own table, not an external address service; the table can be empty for clients who do not maintain it. Requires FasMan database version 300 or higher.

##### GET Address_lookup
`https://api.softtouch.eu/2/accounts/{{accountId}}/address_lookup`
Searches the address table. All filters are optional, match on contains and are combined; the result is distinct and sorted on postal code and street.

When to use it: while the customer types an address: postal code to city, or postal code plus the first letters of the street.

 | 

 | name
 | type
 | 

 | zip_code
 | string
 | contains

 | city
 | string
 | contains

 | street
 | string
 | contains

 | take
 | integer
 | default 50, maximum 200

A brief explanation of the return values:

- zip_code: the postal code

- city: the city

- street: the street name
Example response `Address_lookup` (200):
```json
[
    {
        "zip_code": "9000",
        "city": "Gent",
        "street": "Korenmarkt"
    },
    {
        "zip_code": "9000",
        "city": "Gent",
        "street": "Kouter"
    }
]
```

### V2 / App_notification
#### Introduction

MyFasMan Mobile is the mobile app of FasMan: the stores use it for transfers, inventories, article lookups, and for handling web shop orders and transfer requests. This resource sends a push notification to the devices of a store or a point of sale, so the staff opens the right order in the app the moment it comes in. Android devices, the Expo-based iOS app and the native iOS app are all supported; the API chooses the right push service per device.

##### POST App_notification
`https://api.softtouch.eu/2/accounts/{{accountId}}/app_notification`
Sends a push notification to the MyFasMan Mobile devices of a store or a point of sale.

When to use it: right after you created a web shop order (receipt or reservation) or a transfer request, when the client handles those in MyFasMan Mobile. Send it to the store or POS that has to act; the notification opens the order in the app.

 | 

 | name
 | type
 | 

 | action
 | string
 | required: `webshop` or `transfer_request`

 | data
 | string
 | the id the action refers to, see below

 | title
 | string
 | the title of the notification

 | body
 | string
 | the text of the notification

 | store_id
 | string
 | length 2, the store whose devices receive the notification

 | pos_id
 | string
 | length 4, one point of sale

 | sandbox
 | boolean
 | native iOS only: send through Apple's sandbox (development) APNs environment

 | confetti
 | boolean
 | native iOS only: the app shows a confetti animation when the notification is opened

Always give `store_id` or `pos_id`; without them the notification goes to all devices of the client.

There are two actions:

- action = webshop

- action = transfer_request

With action `webshop`, `data` is the reservation number or the receipt number.
With action `transfer_request`, `data` is the barcode of the transfer request.

The barcode of a transfer request is built from its id: `9981000000000 + (id * 10)`. The last digit is a checksum that the API calculates itself, so it does not matter which digit you send there.

Delivery channels

The API picks the push service per registered device, you do not have to: Android devices receive the notification through Firebase (`firebaseV1` for app version 2.52 and higher, legacy `firebase` for older versions), iOS devices with the Expo-based app through Expo, and the native iOS app directly through Apple Push Notification service (APNs).

Response

The response holds one object per channel, `firebase`, `firebaseV1`, `expo` and `apns`, with the result per device, or a No notifications to send message when no device of that kind was addressed. Errors from these services are informational; Requested entity was not found only means a device is no longer registered and can be ignored. Contact SoftTouch when notifications do not arrive at all.
Request body:
```
{
    "action": "webshop",
    "data": "99100644",
    "title": "Test notification To all store 01 users.",
    "body": "Only to store 01",
    "store_id": "01"
}
```
Example response `App_notification` (None):
```json
{
    "firebase": {
        "message": "No notifications to send."
    },
    "firebaseV1": [
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101070523015%3fb82b963fb82b96"
        },
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101070983598%3fb82b963fb82b96"
        },
        {
            "error": {
                "code": 404,
                "message": "Requested entity was not found.",
                "status": "NOT_FOUND",
                "details": [
                    {
                        "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                        "errorCode": "UNREGISTERED"
                    }
                ]
            }
        },
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101071279124%3fb82b963fb82b96"
        },
        {
            "error": {
                "code": 404,
                "message": "Requested entity was not found.",
                "status": "NOT_FOUND",
                "details": [
                    {
                        "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError",
                        "errorCode": "UNREGISTERED"
                    }
                ]
            }
        },
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101071558893%3fb82b963fb82b96"
        },
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101071952461%3fb82b963fb82b96"
        },
        {
            "name": "projects/myfasman-mobile-v2/messages/0:1730101072067258%3fb82b963fb82b96"
        }
    ],
    "expo": {
        "message": "No notifications to send."
    },
    "apns": [
        {
            "device_token": "3f2a\u20269c1e",
            "status": 200,
            "response": ""
        }
    ]
}
```

### V2 / Article_texts
#### Introduction

Article texts are the long texts of a product that a web shop displays: the title, the description, the composition, SEO texts, and so on. In API v1 they are part of the product (the `texts` array); v2 exposes them as a resource of their own, so they can be listed, created, changed and deleted without touching the product.

A text belongs either to an article (`article_id`, the six-digit article id; the text applies to all its variants) or to one variant (`article_variant_id`, the eight-digit article id + variant). Send exactly one of the two.

Every text has a type. The types are defined per client in Article_text_types (v2) and correspond to the text presets of v1. A typical set:

 | 

 | id
 | Text

 | 01
 | Title

 | 02
 | Description

 | 03
 | Colour

 | S1, S2, S3
 | Composition in Dutch, French, English

 | SA, SB, SC
 | SEO text in Dutch, French, English

 | SJ, SK, SL
 | Long description in Dutch, French, English (used by supplier_data)

 | SM, SN, SO
 | Short description in Dutch, French, English (used by supplier_data)

There can be several texts of the same type for one article; `visual_order` decides their order. The five `is_online_n` flags say on which of the (up to five) web shop channels of the client the text is shown.

The supplier_data call fills texts automatically from the brand's supplier connection (Fashion Cloud, Stockbase, Van de Velde, …). Which brands support this can be seen in Brand_attribute_values (attribute 10, texts).

This endpoint requires FasMan database version 300 or higher.

##### GET Article_texts
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts`
Lists article texts. Filter on the articles you display; a database easily holds tens of thousands of texts. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Use it during the product synchronisation to fetch titles, descriptions, compositions and SEO texts per language, filtered on the articles of the batch and on the `is_online_n` flag of your channel. Prefer it over the `texts` array of the v1 product when you synchronise texts separately from stock and prices.

 | 

 | name
 | type
 | 

 | article_ids
 | string
 | comma separated article ids (6 digits each); texts of the article and of all its variants

 | article_variant_ids
 | string
 | comma separated article id + variant (8 digits each)

 | article_text_type_ids
 | string
 | comma separated type ids

 | is_online_1 … is_online_5
 | boolean
 | only texts that are (not) shown on that channel

 | select
 | string
 | fields and relations: articleTextType, products, createdByUser, updatedByUser

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the text

- article_id: the article (6 digits)

- variant_id: the variant, 0 when the text applies to all variants

- article_text_type_id: the type, see Article_text_types

- visual_order: sort order among texts of the same type

- text: the text

- is_online_1 … is_online_5: shown on web shop channel 1 – 5

- created_by_user_id, updated_by_user_id, created_at_date, updated_at_date: who and when
Example response `Article_texts` (200):
```json
[
    {
        "id": 15772,
        "article_id": 236760,
        "variant_id": 1,
        "article_text_type_id": "S1",
        "visual_order": 1,
        "text": "41% Polyester, 49% Polyamide, 10% Elastaan",
        "is_online_1": true,
        "is_online_2": true,
        "is_online_3": true,
        "is_online_4": true,
        "is_online_5": true,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2025-08-27",
        "updated_at_date": "2025-08-27"
    },
    {
        "id": 15771,
        "article_id": 236760,
        "variant_id": 1,
        "article_text_type_id": "S3",
        "visual_order": 1,
        "text": "41% Polyester, 49% Polyamide, 10% Elastane",
        "is_online_1": true,
        "is_online_2": true,
        "is_online_3": true,
        "is_online_4": true,
        "is_online_5": true,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2025-08-27",
        "updated_at_date": "2025-08-27"
    }
]
```

##### GET Article_texts/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts/1`
Fetches one article text by its id. The return values are the same as in the list call; `select` works here too.

When to use it: Use it to re-read one text, for example before an update.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | select
 | string
 |
Example response `Article_texts/{{id}}` (200):
```json
{
    "id": 15772,
    "article_id": 236760,
    "variant_id": 1,
    "article_text_type_id": "S1",
    "visual_order": 1,
    "text": "41% Polyester, 49% Polyamide, 10% Elastaan",
    "is_online_1": true,
    "is_online_2": true,
    "is_online_3": true,
    "is_online_4": true,
    "is_online_5": true,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2025-08-27",
    "updated_at_date": "2025-08-27"
}
```

##### POST Article_texts
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts`
Creates an article text.

When to use it: Use it when the texts are written outside FasMan, in the web shop's CMS or a PIM, and the client wants them in FasMan too (for other channels, labels or the catalogue). Send one text per type and language.

 | 

 | name
 | type
 | 

 | article_id
 | integer
 | 6 digits, the article must be active; the text applies to all variants. Send either article_id or article_variant_id

 | article_variant_id
 | integer
 | 8 digits, the variant must be active

 | article_text_type_id
 | string
 | required, see Article_text_types

 | text
 | string
 | required

 | visual_order
 | integer
 | sort order among texts of the same type

 | is_online_1 … is_online_5
 | boolean
 | show the text on that channel

 | user_id
 | string
 | required, active FasMan user id, length 4; defaults to the API user

The response is the created text, as in the list call.
Request body:
```
{
    "article_variant_id": 12345601,
    "article_text_type_id": "01",
    "text": "This is a test.",
    "visual_order": 1,
    "is_online_1": 1,
    "is_online_2": 0,
    "is_online_3": 0,
    "is_online_4": 0,
    "is_online_5": 0,
    "user_id": "1001"
}
```
Example response `Article_texts` (200):
```json
{
    "id": 15803,
    "article_id": 123456,
    "variant_id": 1,
    "article_text_type_id": "01",
    "visual_order": 1,
    "text": "This is a test.",
    "is_online_1": true,
    "is_online_2": false,
    "is_online_3": false,
    "is_online_4": false,
    "is_online_5": false,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-14"
}
```

##### POST Article_texts/supplier_data
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts/supplier_data`
Fetches the texts of a product from the supplier connection of its brand and stores them as article texts. The brand of the article must have a text provider configured (Brand_attribute_values, attribute 10). The supplier is queried with the EANs of the article; texts are stored on the article or the variant, in the language asked.

When to use it: Use it when a product of a connected brand has no texts yet: one call fetches the supplier's description and composition and stores them, ready for the web shop. Typically called for new articles right after the product synchronisation detects them, with the EANs of the article.

 | 

 | name
 | type
 | 

 | article_id
 | integer
 | 6 digits; store the texts for all variants. Send either article_id or article_variant_id

 | article_variant_id
 | integer
 | 8 digits; store the texts for this variant only

 | article_eans
 | array
 | required, the EANs (barcodes) of the article, max. 13 digits each

 | article_text_type_id
 | string
 | the type used for the material / composition text; required when text_type contains "material" or is omitted

 | article_extra_text_type_id
 | string
 | the type used for extra supplier texts; defaults to article_text_type_id

 | text_type
 | array
 | which texts to fetch, e.g. ["material", "description"]; default all

 | language
 | string
 | nl, fr or en, default nl; short and long descriptions are stored as types SM/SN/SO and SJ/SK/SL

 | online_number
 | integer
 | 1 – 5, mark the stored texts online for this channel

 | user_id
 | string
 | FasMan user id, length 4; defaults to the API user

The response is the list of article texts that were created, in the same format as the list call. A brand without text provider, or a supplier that has no data for the EANs, results in a `400` error.
Request body:
```
{
    "article_variant_id": 25007501,
    "article_text_type_id": "01",
    "article_extra_text_type_id": "02",
    "article_eans": [
        4060938382995,
        4060938383008,
        4060938383015,
        4060938383022,
        4060938383039
    ],
    "online_number": 1,
    "user_id": "1001",
    "language": "en"
}
```
Example response `Article_texts/supplier_data` (200):
```json
[
    {
        "id": 15801,
        "article_id": 250075,
        "variant_id": 1,
        "article_text_type_id": "01",
        "visual_order": 1,
        "text": "Recycled polyester jacket",
        "is_online_1": true,
        "is_online_2": true,
        "is_online_3": true,
        "is_online_4": true,
        "is_online_5": true,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2025-08-27",
        "updated_at_date": "2025-08-27"
    },
    {
        "id": 15802,
        "article_id": 250075,
        "variant_id": 1,
        "article_text_type_id": "SO",
        "visual_order": 1,
        "text": "Lightweight jacket in recycled polyester with a detachable hood.",
        "is_online_1": true,
        "is_online_2": true,
        "is_online_3": true,
        "is_online_4": true,
        "is_online_5": true,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2025-08-27",
        "updated_at_date": "2025-08-27"
    }
]
```

##### PATCH Article_texts
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts/1`
Updates an article text. The article and the type cannot be changed.

When to use it: Use it to correct a text or to switch it on or off for a channel without recreating it.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | text
 | string
 | required

 | visual_order
 | integer
 | 

 | is_online_1 … is_online_5
 | boolean
 | 

 | user_id
 | string
 | required, active FasMan user id; defaults to the API user

The response is the updated text.
Request body:
```
{
    "text": "This is a test.",
    "visual_order": 1,
    "is_online_1": 1,
    "is_online_2": 0,
    "is_online_3": 0,
    "is_online_4": 0,
    "is_online_5": 0,
    "user_id": "1001"
}
```
Example response `Article_texts` (200):
```json
{
    "id": 15803,
    "article_id": 123456,
    "variant_id": 1,
    "article_text_type_id": "01",
    "visual_order": 1,
    "text": "This is a test.",
    "is_online_1": true,
    "is_online_2": false,
    "is_online_3": false,
    "is_online_4": false,
    "is_online_5": false,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-14"
}
```

##### DELETE Article_texts
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_texts/1`
Deletes an article text. The response is `true`.

When to use it: Use it to remove a text your integration created, for example when the CMS deleted it.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Article_texts` (200):
```json
true
```

### V2 / Article_wash_instructions
#### Introduction

The link between an article (or one colour of it) and the care symbols it carries. Each row points to one instruction of the master list in Wash_instructions (kind, titles, icon). This is the version 2 counterpart of Product wash and care instructions (v1), with filters per article and the possibility to fetch the symbols from the supplier for connected brands. Requires FasMan database version 306 or higher.

An article id is the 6-digit article number; an article variant id is the article id followed by the two-digit colour number (`17467201` = article 174672, colour 01).

##### GET Article_wash_instructions
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_wash_instructions`
Lists the care symbols per article. Like every list call, the result is limited to 500 records per call; filter on the articles of the batch you are processing.

When to use it: during the product synchronisation, to show the care symbols on the product page; map `wash_and_care_instruction_id` to the cached master list from Wash_instructions.

 | 

 | name
 | type
 | 

 | article_ids
 | string
 | comma separated article ids

 | article_variant_ids
 | string
 | comma separated article variant ids

 | wash_and_care_instruction_ids
 | string
 | comma separated: articles that carry these symbols

 | select
 | string
 | `*`, or add `products` for the products of the article

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the link

- article_id: the article

- variant_id: the colour number, `null` when the symbol applies to all colours

- article_variant_id: article id + colour number

- wash_and_care_instruction_id: the symbol, see Wash_instructions

- created_at, updated_at
Example response `Article_wash_instructions` (200):
```json
[
    {
        "id": 5,
        "article_variant_id": 17467201,
        "article_id": 174672,
        "variant_id": 1,
        "wash_and_care_instruction_id": 7,
        "created_at": "2020-12-11 11:53:43",
        "updated_at": "2020-12-11 11:53:43"
    },
    {
        "id": 6,
        "article_variant_id": 17467201,
        "article_id": 174672,
        "variant_id": 1,
        "wash_and_care_instruction_id": 12,
        "created_at": "2020-12-11 11:53:43",
        "updated_at": "2020-12-11 11:53:43"
    }
]
```

##### GET Article_wash_instructions/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_wash_instructions/5`
Fetches one article/symbol link by its id.

When to use it: rarely; to re-read one link, for example after supplier_data.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 |
Example response `Article_wash_instructions/{{id}}` (200):
```json
{
    "id": 5,
    "article_variant_id": 17467201,
    "article_id": 174672,
    "variant_id": 1,
    "wash_and_care_instruction_id": 7,
    "created_at": "2020-12-11 11:53:43",
    "updated_at": "2020-12-11 11:53:43"
}
```

##### POST Article_wash_instructions/supplier_data
`https://api.softtouch.eu/2/accounts/{{accountId}}/article_wash_instructions/supplier_data`
Fetches the care symbols of an article from the supplier and stores them in FasMan. The brand of the article decides the source (Brand_attribute_values, attribute 11): the SoftTouch price catalogue (EDI pricat), the Van de Velde API or the Fashion Cloud API. Symbols that were already linked are kept; nothing is removed.

When to use it: when a product of a connected brand has no care symbols yet, right after the product synchronisation detects the new article. Give one article (or one colour) and the EANs of its sizes.

 | 

 | name
 | type
 | 

 | article_id
 | integer
 | the article; either article_id or article_variant_id, not both

 | article_variant_id
 | integer
 | one colour of the article

 | article_eans
 | array
 | required, the EANs (max. 13 characters each) of the sizes to look up

The article must be active and have a brand with a care instruction provider; otherwise a validation error is returned. When the supplier cannot be reached, the response is a 400 error with Receiving data from the … API failed.

The response is the list of symbols linked to the article after the import, with the same fields as the list call.
Request body:
```
{
    "article_variant_id": 17467201,
    "article_eans": [
        "5400508495011"
    ]
}
```
Example response `Article_wash_instructions/supplier_data` (200):
```json
[
    {
        "id": 5,
        "article_variant_id": 17467201,
        "article_id": 174672,
        "variant_id": 1,
        "wash_and_care_instruction_id": 7,
        "created_at": "2020-12-11 11:53:43",
        "updated_at": "2020-12-11 11:53:43"
    },
    {
        "id": 6,
        "article_variant_id": 17467201,
        "article_id": 174672,
        "variant_id": 1,
        "wash_and_care_instruction_id": 12,
        "created_at": "2020-12-11 11:53:43",
        "updated_at": "2020-12-11 11:53:43"
    }
]
```

### V2 / Brand_attribute_values
#### Introduction

Brand attribute values describe what a brand (supplier) can do through the supplier connections of the SoftTouch API: which provider delivers its stock information, its photos, its texts, its wash and care instructions, and where drop-ship orders are sent. They are set by SoftTouch when a supplier connection is activated for a client, and are read-only through the API.

Use them to know, before calling one of the supplier_data endpoints, whether a brand supports it.

 | 

 | attribute_id
 | Attribute
 | Used by

 | 5
 | Stock provider
 | Stock/supplier_data

 | 6
 | Photo provider
 | Article_photos/supplier_data

 | 7
 | External id of the brand at the provider
 | Reservation_headers/supplier_data

 | 9
 | Order provider (drop-ship)
 | Reservation_headers/supplier_data

 | 10
 | Text provider
 | Article_texts/supplier_data

 | 11
 | Wash and care provider
 | Article_wash_instructions/supplier_data

The `value` of a provider attribute is a provider code:

 | 

 | value
 | Provider

 | 50000
 | SoftTouch

 | 50001
 | Stockbase

 | 50002
 | Van de Velde

 | 50003
 | Fashion Cloud

 | 50004
 | Andres

 | 50005
 | Marie Méro

 | 50006
 | Four Roses

 | 50007
 | Caroline Biss

 | 50008
 | Rev'it

 | 50009
 | Mayerline

This endpoint requires FasMan database version 300 or higher.

##### GET Brand_attribute_values
`{{url}}/2/accounts/{{accountId}}/brand_attribute_values`
Lists brand attribute values. Filter on an attribute to get, for example, every brand with a stock provider. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Call it once when the integration starts (and refresh it daily) to know for which brands you may use the supplier_data calls: attribute 5 tells you whose supplier stock you can show, attribute 9 for which brands drop-ship orders can be placed, attribute 10 and 11 for which brands texts and care instructions can be fetched.

 | 

 | name
 | type
 | 

 | attribute_id
 | integer
 | one attribute

 | attribute_ids
 | string
 | comma separated attribute ids

 | select
 | string
 | fields and relations: brand

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the value

- attribute_id: the attribute, see the folder description

- brand_id: the brand (3 characters)

- value: the provider code, or the external id for attribute 7
Example response `Brand_attribute_values` (200):
```json
[
    {
        "id": 12,
        "attribute_id": 5,
        "brand_id": "193",
        "value": "50001"
    },
    {
        "id": 13,
        "attribute_id": 10,
        "brand_id": "193",
        "value": "50003"
    },
    {
        "id": 1,
        "attribute_id": 7,
        "brand_id": "229",
        "value": "618"
    }
]
```

### V2 / Code_values
#### Introduction

Many fields in this API hold a five-character code from the FasMan code table: the customer order types (310xx) and statuses (311xx), the transfer request statuses (240xx, 250xx), the gift list statuses (010xx … 018xx), the return statuses (210xx … 217xx), the wash instruction kinds (560xx), the item types (001xx) and more. The code is the group (3 characters) followed by the value (2 characters): `31000` is value `00` of group `310`.

The group defines what a code means; the client can give a code its own label and switch it on or off. This resource returns the groups (Code_value_descriptions) and their codes (Code_values), so an integration can show the client's own labels and validate codes instead of hard-coding them. Requires FasMan database version 300 or higher.

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`.

##### GET Code_values
`https://api.softtouch.eu/2/accounts/{{accountId}}/code_values`
Lists code values, usually of one or more groups. Like every list call, the result is limited to 500 records per call.

When to use it: once a day, to cache the labels of the groups your integration uses (order statuses, transfer request statuses, return statuses) and to know which values the client has activated. Filter on the group; the whole table is large.

 | 

 | name
 | type
 | 

 | code_value_description_ids
 | string
 | comma separated group ids (3 characters), e.g. 310,311

 | is_active
 | boolean
 | only active or inactive codes

 | is_useable
 | boolean
 | active codes that have a label

 | is_default
 | boolean
 | only the fixed system values

 | select
 | string
 | `*`, or add `code_value_description` for the group

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the code (5 characters)

- code_value_description_id: the group (3 characters)

- default_name: the standard label of the code

- custom_name: the label the client gave it

- visual_order: display order within the group

- is_default: fixed system value that cannot be removed

- is_active: the code is switched on

- is_useable: active and has a label; only these should be offered to users
Example response `Code_values` (200):
```json
[
    {
        "id": "31000",
        "code_value_description_id": "310",
        "default_name": "TO PICK UP",
        "custom_name": "TO PICK UP",
        "visual_order": 0,
        "is_default": true,
        "is_active": true,
        "is_useable": true
    },
    {
        "id": "31001",
        "code_value_description_id": "310",
        "default_name": "TO DESPATCH",
        "custom_name": "TO DESPATCH",
        "visual_order": 1,
        "is_default": true,
        "is_active": true,
        "is_useable": true
    }
]
```

##### GET Code_values/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/code_values/31000`
Fetches one code value. An unknown code returns a validation error.

When to use it: to validate a code you received before storing it, or to look up its label.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, 5 characters

 | select
 | string
 | `*`, or add `code_value_description`
Example response `Code_values/{{id}}` (200):
```json
{
    "id": "31000",
    "code_value_description_id": "310",
    "default_name": "TO PICK UP",
    "custom_name": "TO PICK UP",
    "visual_order": 0,
    "is_default": true,
    "is_active": true,
    "is_useable": true,
    "code_value_description": {
        "id": "310",
        "name": "CUSTOMER ORDER TYPE"
    }
}
```

##### GET Code_value_descriptions
`https://api.softtouch.eu/2/accounts/{{accountId}}/code_value_descriptions`
Lists the code groups. Like every list call, the result is limited to 500 records per call.

When to use it: to discover which groups exist, and, with `select=*,code_values`, to fetch a group with all its codes in one call.

 | 

 | name
 | type
 | 

 | select
 | string
 | `*`, or add `code_values` for the codes of each group

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the group (3 characters)

- name: the name of the group

- code_values (with select): the codes of the group, see Code_values
Example response `Code_value_descriptions` (200):
```json
[
    {
        "id": "001",
        "name": "ITEM TYPE"
    },
    {
        "id": "310",
        "name": "CUSTOMER ORDER TYPE"
    },
    {
        "id": "311",
        "name": "CUSTOMER ORDER STATUS"
    }
]
```

##### GET Code_value_descriptions/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/code_value_descriptions/310`
Fetches one code group, with its codes when `select=*,code_values` is given.

When to use it: to fetch one group with all its codes in a single call.

 | 

 | name
 | type
 | 

 | id
 | string
 | required, in the URL, 3 characters

 | select
 | string
 | `*`, or `*,code_values`
Example response `Code_value_descriptions/{{id}}` (200):
```json
{
    "id": "310",
    "name": "CUSTOMER ORDER TYPE",
    "code_values": [
        {
            "id": "31000",
            "code_value_description_id": "310",
            "default_name": "TO PICK UP",
            "custom_name": "TO PICK UP",
            "visual_order": 0,
            "is_default": true,
            "is_active": true,
            "is_useable": true
        },
        {
            "id": "31001",
            "code_value_description_id": "310",
            "default_name": "TO DESPATCH",
            "custom_name": "TO DESPATCH",
            "visual_order": 1,
            "is_default": true,
            "is_active": true,
            "is_useable": true
        }
    ]
}
```

### V2 / Customer_orders
#### Introduction

A customer order in FasMan is an article a store orders for a customer: the size is not in stock, the sales person registers the order at the till, the article is ordered at the supplier (or transferred from another store) and the customer is called when it has arrived. It has a header (customer, store, register, requested date, advance paid, totals) and items (one per article, with a status and the supplier order it was placed on). This is a different thing from a web shop order: web shop orders are receipts or reservations followed through Customer order statuses (v1), and the status board below is a read view on those.

Header statuses: `OPEN`, `ORDER` (ordered at the supplier), `CLOSE`. Item statuses: `OPEN`, `TOORDER`, `ORDER`, `READY` (arrived, customer can collect), `CLOSED`, `MISSING`, `CANCEL`, `CANCELLED`. Requires FasMan database version 300 or higher.

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`. Relations for headers: `customer`, `store`, `point_of_sale`, `advance`, `brand`, `season`, `created_by_user`, `updated_by_user`, `customer_order_items` and nested `customer_order_items.product`, `.unique_product`, `.discount_type`, `.supplier_order_header`. Relations for items: the same plus `customer_order_header` (and its nested `advance`, `brand`, `season`).

##### GET Customer_order_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_headers`
Lists customer orders. Like every list call, the result is limited to 500 records per call.

When to use it: to show a customer the articles the store ordered for them on a my account page (`customer_ids`, with `select=*,customer_order_items`), or to give a back-office tool an overview of open orders per store.

 | 

 | name
 | type
 | 

 | customer_ids
 | string
 | comma separated customer numbers

 | store_ids
 | string
 | comma separated store ids

 | point_of_sale_ids
 | string
 | comma separated POS ids

 | statuses
 | string
 | comma separated: OPEN, ORDER, CLOSE

 | is_processed
 | boolean
 | 

 | brand_ids, brand_2_ids, season_ids
 | string
 | comma separated

 | advance_ids
 | string
 | comma separated advance cheque numbers (999903…)

 | select
 | string
 | `*`, plus relations, e.g. `*,customer_order_items,customer`

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

Ids given in the filters must exist; an unknown id returns a validation error, not an empty list.

A brief explanation of the return values:

- id: the order number

- point_of_sale_id, store_id: where the order was taken

- customer_id: the customer

- advance_id: the advance cheque (999903…) the customer paid, or null

- brand_id, season_id: brand and season of the order, when set

- preferred_date: the date the customer would like the goods

- remark

- status: OPEN, ORDER or CLOSE

- is_processed

- gross_amount, discount_amount, net_amount, paid_amount

- created_by_user_id, updated_by_user_id, created_at_date, updated_at_date

- order_type, brand_2_id: extra fields, only with `select`
Example response `Customer_order_headers` (200):
```json
[
    {
        "id": 1024,
        "point_of_sale_id": "0101",
        "store_id": "01",
        "customer_id": 20563,
        "advance_id": 99999903000418,
        "brand_id": "045",
        "season_id": "W26",
        "preferred_date": "2026-09-25",
        "remark": "Customer calls before collecting",
        "status": "OPEN",
        "is_processed": false,
        "gross_amount": 179.9,
        "discount_amount": 10,
        "net_amount": 169.9,
        "paid_amount": 50,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2026-09-14",
        "updated_at_date": "2026-09-14"
    }
]
```

##### GET Customer_order_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_headers/1024`
Fetches one customer order; add `select=*,customer_order_items` (or `*,customer_order_items.product`) for its lines.

When to use it: for the detail of one customer order, in a my account page or a back-office tool.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 |
Example response `Customer_order_headers/{{id}}` (200):
```json
{
    "id": 1024,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "advance_id": 99999903000418,
    "brand_id": "045",
    "season_id": "W26",
    "preferred_date": "2026-09-25",
    "remark": "Customer calls before collecting",
    "status": "OPEN",
    "is_processed": false,
    "gross_amount": 179.9,
    "discount_amount": 10,
    "net_amount": 169.9,
    "paid_amount": 50,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-14",
    "customer_order_items": [
        {
            "id": 3311,
            "customer_order_header_id": 1024,
            "customer_order_line": 1,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "customer_id": 20563,
            "product_id": 55556101040101,
            "unique_product_id": null,
            "discount_type_id": null,
            "supplier_order_header_id": 78812,
            "status": "ORDER",
            "expected_date": "2026-09-25",
            "ordered_date": "2026-09-15",
            "confirmed_date": null,
            "delivered_date": null,
            "description": "Blazer navy (38)",
            "remark": "",
            "quantity": 1,
            "unit_price": 179.9,
            "discount_amount": 10,
            "net_amount": 169.9,
            "vat_percentage": 21,
            "created_by_user_id": "1001",
            "updated_by_user_id": "1001",
            "created_at_date": "2026-09-14",
            "updated_at_date": "2026-09-15"
        }
    ]
}
```

##### POST Customer_order_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_headers`
Creates a customer order with its items. Prices, description and VAT default to the product's values when they are not given; totals are calculated. Nothing else changes: no stock movement, no supplier order and no receipt. The advance, when given, must already exist as a cheque.

When to use it: from a tool that registers customer orders outside the till, for example a personal shopping or in-store ordering app. Web shop orders are receipts or reservations, not customer orders.

 | 

 | name
 | type
 | 

 | point_of_sale_id
 | string
 | required, length 4

 | store_id
 | string
 | required, length 2

 | customer_id
 | integer
 | required

 | advance_id
 | integer
 | the advance cheque number (999903…); its value becomes paid_amount

 | date_preferred
 | date
 | requested date (returned as preferred_date)

 | order_type
 | string
 | length 2

 | status
 | string
 | OPEN (default), ORDER, CLOSE

 | is_processed
 | boolean
 | 

 | brand_id, brand_2_id, season_id
 | string
 | 

 | remark
 | string
 | 

 | user_id
 | string
 | length 4, FasMan user; default the API user

 | items
 | array
 | required, min. 1

 | items[].product_id
 | integer
 | required, the 14-digit product key; must be active

 | items[].status
 | string
 | required: OPEN, TOORDER, ORDER, READY, CLOSED, MISSING, CANCEL, CANCELLED

 | items[].quantity
 | integer
 | default 1

 | items[].unit_price
 | numeric
 | default the selling price

 | items[].discount
 | numeric
 | discount amount (returned as discount_amount)

 | items[].discount_type_id
 | integer
 | 

 | items[].description
 | string
 | default the product description

 | items[].vat_pct
 | integer
 | default the product VAT

 | items[].remark
 | string
 | 

 | items[].confirm_email, confirm_tel, confirm_gsm, confirm_sms
 | boolean
 | how the customer wants to be told the article arrived

The response is the created header; add `select=*,customer_order_items` to see the lines.
Request body:
```
{
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "date_preferred": "2026-09-25",
    "remark": "Customer calls before collecting",
    "items": [
        {
            "product_id": 55556101040101,
            "quantity": 1,
            "status": "TOORDER"
        }
    ]
}
```
Example response `Customer_order_headers` (200):
```json
{
    "id": 1024,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "advance_id": null,
    "brand_id": null,
    "season_id": null,
    "preferred_date": "2026-09-25",
    "remark": "Customer calls before collecting",
    "status": "OPEN",
    "is_processed": false,
    "gross_amount": 179.9,
    "discount_amount": 10,
    "net_amount": 169.9,
    "paid_amount": 0,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-14",
    "customer_order_items": [
        {
            "id": 3311,
            "customer_order_header_id": 1024,
            "customer_order_line": 1,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "customer_id": 20563,
            "product_id": 55556101040101,
            "unique_product_id": null,
            "discount_type_id": null,
            "supplier_order_header_id": null,
            "status": "TOORDER",
            "expected_date": "2026-09-25",
            "ordered_date": null,
            "confirmed_date": null,
            "delivered_date": null,
            "description": "Blazer navy (38)",
            "remark": "",
            "quantity": 1,
            "unit_price": 179.9,
            "discount_amount": 10,
            "net_amount": 169.9,
            "vat_percentage": 21,
            "created_by_user_id": "1001",
            "updated_by_user_id": "1001",
            "created_at_date": "2026-09-14",
            "updated_at_date": "2026-09-14"
        }
    ]
}
```

##### PATCH Customer_order_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_headers/1024`
Updates the header of a customer order. Only the parameters that are sent are changed; items, amounts, store and register cannot be changed here (items have their own PATCH).

When to use it: to close an order once everything was collected, or to change the requested date or remark.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | customer_id
 | integer
 | 

 | date_preferred
 | date
 | 

 | order_type
 | string
 | length 2

 | status
 | string
 | OPEN, ORDER, CLOSE

 | is_processed
 | boolean
 | 

 | brand_id, brand_2_id, season_id
 | string
 | 

 | remark
 | string
 | 

 | user_id
 | string
 | length 4

The response is the updated header.
Request body:
```
{
    "status": "CLOSE",
    "is_processed": true
}
```
Example response `Customer_order_headers/{{id}}` (200):
```json
{
    "id": 1024,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "advance_id": 99999903000418,
    "brand_id": "045",
    "season_id": "W26",
    "preferred_date": "2026-09-25",
    "remark": "Customer calls before collecting",
    "status": "CLOSE",
    "is_processed": true,
    "gross_amount": 179.9,
    "discount_amount": 10,
    "net_amount": 169.9,
    "paid_amount": 50,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-14"
}
```

##### GET Customer_order_items
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_items`
Lists customer order items across orders. Like every list call, the result is limited to 500 records per call.

When to use it: for lists that cut across orders: all lines that are READY for collection in a store, all lines waiting on one supplier order, or all lines of one product.

 | 

 | name
 | type
 | 

 | customer_order_header_ids
 | string
 | comma separated order numbers

 | customer_ids, store_ids, point_of_sale_ids
 | string
 | comma separated

 | product_ids, unique_product_ids
 | string
 | comma separated

 | discount_type_ids, supplier_order_header_ids
 | string
 | comma separated

 | statuses
 | string
 | comma separated: OPEN, TOORDER, ORDER, READY, CLOSED, MISSING, CANCEL, CANCELLED

 | select
 | string
 | `*`, plus relations such as `product`, `customer_order_header`, `supplier_order_header`; extra fields `confirm_email`, `confirm_tel`, `confirm_gsm`, `confirm_sms`, `confirmed_email`, `confirmed_tel`, `confirmed_gsm`, `confirmed_sms`

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the line

- customer_order_header_id, customer_order_line: the order and the line number

- point_of_sale_id, store_id, customer_id: copied from the header

- product_id: the 14-digit product key; unique_product_id when it is a unique article

- discount_type_id: see Discount types

- supplier_order_header_id: the supplier order the article was ordered on, or null

- status: OPEN, TOORDER, ORDER, READY, CLOSED, MISSING, CANCEL, CANCELLED

- expected_date, ordered_date, confirmed_date, delivered_date

- description, remark, quantity

- unit_price, discount_amount, net_amount, vat_percentage

- created_by_user_id, updated_by_user_id, created_at_date, updated_at_date

- confirm_* / confirmed_* (with select): how the customer wants to be notified, and whether it was done
Example response `Customer_order_items` (200):
```json
[
    {
        "id": 3311,
        "customer_order_header_id": 1024,
        "customer_order_line": 1,
        "point_of_sale_id": "0101",
        "store_id": "01",
        "customer_id": 20563,
        "product_id": 55556101040101,
        "unique_product_id": null,
        "discount_type_id": null,
        "supplier_order_header_id": 78812,
        "status": "ORDER",
        "expected_date": "2026-09-25",
        "ordered_date": "2026-09-15",
        "confirmed_date": null,
        "delivered_date": null,
        "description": "Blazer navy (38)",
        "remark": "",
        "quantity": 1,
        "unit_price": 179.9,
        "discount_amount": 10,
        "net_amount": 169.9,
        "vat_percentage": 21,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2026-09-14",
        "updated_at_date": "2026-09-15"
    }
]
```

##### GET Customer_order_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_items/3311`
Fetches one customer order item.

When to use it: to re-read one line, for example before updating it.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 |
Example response `Customer_order_items/{{id}}` (200):
```json
{
    "id": 3311,
    "customer_order_header_id": 1024,
    "customer_order_line": 1,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "product_id": 55556101040101,
    "unique_product_id": null,
    "discount_type_id": null,
    "supplier_order_header_id": 78812,
    "status": "ORDER",
    "expected_date": "2026-09-25",
    "ordered_date": "2026-09-15",
    "confirmed_date": null,
    "delivered_date": null,
    "description": "Blazer navy (38)",
    "remark": "",
    "quantity": 1,
    "unit_price": 179.9,
    "discount_amount": 10,
    "net_amount": 169.9,
    "vat_percentage": 21,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-15",
    "confirm_sms": true,
    "confirmed_sms": false
}
```

##### PATCH Customer_order_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_items/3311`
Updates the status, dates, description, remark and notification flags of an item. Quantity, price and product cannot be changed; header totals are not recalculated.

When to use it: when a purchasing tool places the supplier order (status ORDER, ordered_date), or when the customer was notified (confirmed_sms, confirmed_email).

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | status
 | string
 | OPEN, TOORDER, ORDER, READY, CLOSED, MISSING, CANCEL, CANCELLED

 | expected_date, ordered_date, confirmed_date, delivered_date
 | date
 | 

 | description
 | string
 | 

 | remark
 | string
 | 

 | confirm_email, confirm_tel, confirm_gsm, confirm_sms
 | boolean
 | the customer wants to be notified this way

 | confirmed_email, confirmed_tel, confirmed_gsm, confirmed_sms
 | boolean
 | the notification was sent

 | user_id
 | string
 | length 4

The response is the updated item.
Request body:
```
{
    "status": "ORDER",
    "ordered_date": "2026-09-15",
    "confirm_sms": true
}
```
Example response `Customer_order_items/{{id}}` (200):
```json
{
    "id": 3311,
    "customer_order_header_id": 1024,
    "customer_order_line": 1,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "customer_id": 20563,
    "product_id": 55556101040101,
    "unique_product_id": null,
    "discount_type_id": null,
    "supplier_order_header_id": 78812,
    "status": "ORDER",
    "expected_date": "2026-09-25",
    "ordered_date": "2026-09-15",
    "confirmed_date": null,
    "delivered_date": null,
    "description": "Blazer navy (38)",
    "remark": "",
    "quantity": 1,
    "unit_price": 179.9,
    "discount_amount": 10,
    "net_amount": 169.9,
    "vat_percentage": 21,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2026-09-14",
    "updated_at_date": "2026-09-15"
}
```

##### POST Customer_order_items/deliver
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_items/deliver`
Marks an ordered article as arrived for the customer: the item gets status READY and today's delivered date. When fewer pieces arrived than ordered (`quantity` lower than `full_quantity`), the line is split: the delivered pieces become READY and a new line with the remaining quantity keeps the old status. Stock is not changed; the delivery itself is booked with Products/stock_action.

When to use it: from a receiving or warehouse tool, after the supplier delivery is booked, so the store knows which customer can be called. The response tells you whether the whole order is now complete (`finished_header`) and whether the customer asked for an SMS (`confirm_sms`).

 | 

 | name
 | type
 | 

 | header_id
 | integer
 | required, the order number

 | item_id
 | integer
 | required, the item id

 | quantity
 | integer
 | required, the pieces that arrived

 | full_quantity
 | integer
 | required, the pieces that were ordered on the line

 | user_id
 | string
 | length 4

A brief explanation of the return values:

- finished_header: no open lines are left on the order

- confirm_sms: the customer asked to be notified by SMS

- customer_id, product_id: of the delivered line
Request body:
```
{
    "header_id": 1024,
    "item_id": 3311,
    "quantity": 1,
    "full_quantity": 1
}
```
Example response `Customer_order_items/deliver` (200):
```json
{
    "finished_header": true,
    "confirm_sms": true,
    "customer_id": 20563,
    "product_id": 55556101040101
}
```

##### GET Customer_order_status_board
`https://api.softtouch.eu/2/accounts/{{accountId}}/customer_order_status_board`
The follow-up board of web shop and customer order lines: every Customer order status (v1) joined with the receipt or reservation line it belongs to and the customer, newest first. This is the same view FasMan shows the store; use it instead of joining the three resources yourself.

When to use it: for a dashboard of open web shop orders per store (`warehouse_id`, `status_not_in=31108,31109`), or to see all lines of one order (`receipt_id` or `reservation_id`).

 | 

 | name
 | type
 | 

 | warehouse_id
 | string
 | store id (2 characters)

 | receipt_id
 | integer
 | only the lines of this receipt

 | reservation_id
 | integer
 | only the lines of this reservation

 | status_not_in
 | string
 | comma separated status codes to exclude, e.g. 31108,31109

 | take
 | integer
 | default 200, max. 500, applied to receipts and reservations separately

A brief explanation of the return values:

- id: the customer order status id (the same id as in Customer order statuses)

- is_receipt: 1 for a receipt line, 0 for a reservation line

- ticket_id, ticket_line: the receipt or reservation number and line

- type_id: 31000 to pick up, 31001 to despatch

- status_id: 31100 … 31109, see Customer order statuses

- created_at: when the status was created

- end_point_warehouse_id: the store the piece has to go to, or null

- date, warehouse_id, pos_id: date, store and register of the line

- barcode, quantity, line_total, description: the article line

- customer_id, customer_name
Example response `Customer_order_status_board` (200):
```json
[
    {
        "id": 134,
        "is_receipt": 1,
        "ticket_id": 1000242880,
        "ticket_line": 4,
        "type_id": "31000",
        "status_id": "31101",
        "created_at": "2026-07-29 11:04:46",
        "end_point_warehouse_id": null,
        "date": "2026-07-29",
        "warehouse_id": "01",
        "pos_id": "0101",
        "barcode": "5412345678901",
        "quantity": 1,
        "line_total": 59.95,
        "customer_id": 20563,
        "customer_name": "An Peeters",
        "description": "T-shirt white M"
    },
    {
        "id": 133,
        "is_receipt": 1,
        "ticket_id": 1000242880,
        "ticket_line": 3,
        "type_id": "31000",
        "status_id": "31108",
        "created_at": "2026-07-29 11:04:46",
        "end_point_warehouse_id": null,
        "date": "2026-07-29",
        "warehouse_id": "01",
        "pos_id": "0101",
        "barcode": "5412345678918",
        "quantity": 1,
        "line_total": 39.95,
        "customer_id": 20563,
        "customer_name": "An Peeters",
        "description": "Jeans blue 30/32"
    }
]
```

### V2 / Gift_list_headers
#### Introduction

The version 2 view on gift lists (see Gift lists in version 1 for the concept and the statuses). A gift list header is the list itself: the parents, the baby, the dates, the status and the web login. Its gifts are the Gift_list_items; load them together with `select=*,gift_list_items.*`. Version 2 is read-only; create and update lists with the version 1 calls.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement.

##### GET Gift_list_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/gift_list_headers?select=*,gift_list_items.*`
Lists gift lists, with their gifts and the related store, customer and status when you ask for them with `select`. Like every list call, the result is limited to 500 records per call.

When to use it: to show the parents their list in the web shop, to let visitors search a list (by customer or by web user, after validate-webuser), and to show the open gifts of a list on the gift list page.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement.

Used parameters:

- take

- skip

- customer_ids (comma separated)

- store_ids (comma separated)

- status_ids (comma separated)

- is_online (boolean)

Possible extra data visible by using the "select" parameter:

- gift_list_items.*

- store.*

- customer.*

- status.*

- created_by_user.*

- updated_by_user.*

A brief explanation of return values:

Most fields are explained in the version 1 Gift lists folder; the table maps them to the version 1 names.

 | 

 | Field
 | Type
 | V1 field / Description

 | id
 | integer
 | key

 | store_id
 | string (2 characters)
 | store

 | customer_id
 | integer
 | customer

 | status_id
 | string (5 characters)
 | status

 | surname
 | string
 | surname

 | address
 | string
 | address

 | postal_code
 | string
 | postcode

 | city
 | string
 | city

 | parent
 | string
 | mother

 | co_parent
 | string
 | father

 | baby
 | string
 | baby_name

 | siblings
 | string
 | brothers_sisters

 | sex
 | string
 | sex

 | miscellaneous
 | string
 | free_text

 | date_1
 | date
 | date1

 | date_2
 | date
 | date2

 | date_3
 | date
 | date3

 | date_4
 | date
 | date4

 | value_1
 | numeric
 | value1

 | value_2
 | numeric
 | value2

 | value_3
 | numeric
 | value3

 | remark
 | text
 | remark

 | is_online
 | boolean
 | online

 | web_user
 | string
 | webuser

 | web_password
 | string
 | webpass

 | created_by_user_id
 | string (4 characters)
 | The ID of the user that created the giftlist

 | updated_by_user_id
 | string (4 characters)
 | The ID of the user that most recently updated the giftlist

 | created_at_date
 | date
 | created

 | updated_at_date
 | date
 | modified

 | gift_list_items.*
 | array
 | array of giftlist item objects

 | store.*
 | object
 | object with all information on the store the giftlist is being managed in

 | customer.*
 | object
 | object with all information on the customer that was assigned to the giftlist

 | status.*
 | object
 | object with more information / descriptions about the status assigned to the giftlist

 | created_by_user.*
 | object
 | object with the name and other information of the user that created the giftlist

 | updated_by_user.*
 | object
 | object with the name and other information of the user that most recently updated the giftlist
Example response `Gift_list_headers` (200):
```json
[
    {
        "id": 1,
        "store_id": "02",
        "customer_id": 4,
        "status_id": "01000",
        "surname": "Doe",
        "address": "Hoofdstraat 123",
        "postal_code": "1000",
        "city": "Bruxelles",
        "parent": "Mother name",
        "co_parent": "Father name",
        "baby": "Baby name",
        "siblings": "Sibling names",
        "sex": "Sex of the baby",
        "miscellaneous": "",
        "date_1": "2024-10-06",
        "date_2": "2024-09-30",
        "date_3": "2024-11-30",
        "date_4": "2024-10-28",
        "value_1": 0,
        "value_2": 0,
        "value_3": 0,
        "remark": null,
        "is_online": true,
        "web_user": "johndoe_245@fictional.com",
        "web_password": "Twh43*sLK",
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2024-10-28",
        "updated_at_date": "2024-11-07",
        "gift_list_items": [
            {
                "id": 1,
                "gift_list_header_id": 1,
                "location_id": "01700",
                "status_id": "01500",
                "pickup_by_id": "",
                "stock_status_id": "01800",
                "item_id": 10000301030102,
                "unique_product_id": 0,
                "gift_list_line": 1,
                "customer_sold_id": 9,
                "receipt_header_sold_id": 0,
                "point_of_sale_sold_id": "",
                "customer_sold_name": "",
                "description": "Heren Kleding SoftTouch",
                "date_sold": "2024-10-28",
                "gross_amount": 19.95,
                "discount_amount": 0,
                "net_amount": 19.95,
                "remark": null,
                "is_online": true,
                "must_buy": false,
                "created_by_user_id": "1001",
                "updated_by_user_id": "1001",
                "created_at_date": "2024-10-28",
                "updated_at_date": "2024-10-28",
                "updated_at": "2024-10-28 14:20:49",
                "date_2": "2024-10-28",
                "date_3": "2024-10-28",
                "date_4": "2024-10-28"
            }
        ]
    },
    {
        "id": 2,
        "store_id": "01",
        "customer_id": 1,
        "status_id": "01000",
        "surname": "surname",
        "address": "",
        "postal_code": "",
        "city": "",
        "parent": "",
        "co_parent": "",
        "baby": "",
        "siblings": "",
        "sex": "",
        "miscellaneous": "",
        "date_1": "0001-01-01",
        "date_2": "0001-01-01",
        "date_3": "0001-01-01",
        "date_4": "0001-01-01",
        "value_1": 0,
        "value_2": 0,
        "value_3": 0,
        "remark": null,
        "is_online": true,
        "web_user": "gebruiker@softtouch.be",
        "web_password": "THISISTHEPASSWORD",
        "created_by_user_id": "",
        "updated_by_user_id": "",
        "created_at_date": "2024-10-31",
        "updated_at_date": "2024-10-31",
        "gift_list_items": [
            {
                "id": 2,
                "gift_list_header_id": 2,
                "location_id": "01700",
                "status_id": "01502",
                "pickup_by_id": "01601",
                "stock_status_id": "01802",
                "item_id": 10000301030101,
                "unique_product_id": 0,
                "gift_list_line": 1,
                "customer_sold_id": 9,
                "receipt_header_sold_id": 1000000002,
                "point_of_sale_sold_id": "",
                "customer_sold_name": "Uncle John",
                "description": "This is a description.",
                "date_sold": "2024-10-30",
                "gross_amount": 100,
                "discount_amount": 25,
                "net_amount": 75,
                "remark": null,
                "is_online": true,
                "must_buy": false,
                "created_by_user_id": "",
                "updated_by_user_id": "1001",
                "created_at_date": "2024-10-31",
                "updated_at_date": "2024-11-07",
                "updated_at": "2024-11-07 08:59:53",
                "date_2": "2024-10-31",
                "date_3": "2024-10-31",
                "date_4": "2024-10-31"
            }
        ]
    }
]
```

##### GET Gift_list_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/gift_list_headers/1`
Fetches one gift list by its id, with the same `select` options and return values as the list call.

When to use it: for the page of one gift list, with `select=*,gift_list_items.*,gift_list_items.product.*` to get the gifts and their products in one call.
Example response `Gift_list_headers/{{id}}` (200):
```json
{
    "id": 1,
    "store_id": "02",
    "customer_id": 4,
    "status_id": "01000",
    "surname": "Doe",
    "address": "Hoofdstraat 123",
    "postal_code": "1000",
    "city": "Bruxelles",
    "parent": "Mother name",
    "co_parent": "Father name",
    "baby": "Baby name",
    "siblings": "Sibling names",
    "sex": "Sex of the baby",
    "miscellaneous": "",
    "date_1": "2024-10-06",
    "date_2": "2024-09-30",
    "date_3": "2024-11-30",
    "date_4": "2024-10-28",
    "value_1": 0,
    "value_2": 0,
    "value_3": 0,
    "remark": null,
    "is_online": true,
    "web_user": "johndoe_245@fictional.com",
    "web_password": "Twh43*sLK",
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2024-10-28",
    "updated_at_date": "2024-11-07"
}
```

### V2 / Gift_list_items
#### Introduction

A gift list item is one gift on a gift list: the product, its status (open, reserved, sold), where it is, who bought it and on which receipt. Load the header with `select=*,gift_list_header.*`, or load the items through Gift_list_headers. Version 2 is read-only; add and update gifts with the version 1 calls.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement.

##### GET Gift_list_items
`https://api.softtouch.eu/2/accounts/{{accountId}}/gift_list_items`
Lists gifts across gift lists, filtered on status, location or buyer, with the related product, cheque, receipt and users when you ask for them with `select`. Like every list call, the result is limited to 500 records per call.

When to use it: for reports across lists (all gifts sold today, all gifts still to be ordered), or for a my gifts page of a buyer (`customer_sold_ids`). For the gifts of one list, use Gift_list_headers with `select`.

Gift lists differ per client. The gift list module is customised for almost every client, so this documentation describes the default behaviour. Check with the client whether their gift lists deviate before you implement.

Used parameters:

- take

- skip

- location_ids (comma separated)

- status_ids (comma separated)

- pickup_by_ids (comma separated)

- stock_status_ids (comma separated)

- customer_sold_ids (comma separated)

- receipt_header_sold_ids (comma separated)

- point_of_sale_sold_ids (comma separated)

- is_online (boolean)

- must_buy (boolean)

Possible extra data visible by using the "select" parameter:

- miscellaneous_3 -> miscellaneous_9

- status_2_id

- status_3_id

- pre_deliver

- gift_list_header.*

- gift_list_header.status.*

- gift_list_header.created_by_user.*

- gift_list_header.updated_by_user.*

- location.*

- status.*

- status_2.*

- status_3.*

- pickup_by.*

- stock_status.*

- product.*

- cheque.*

- customer_sold.*

- receipt_header_sold.*

- receipt_header_sold.receipt_items.*

- point_of_sale_sold.*

- created_by_user.*

- updated_by_user.*

A brief explanation of return values:

Most fields are explained in the version 1 Gift lists folder (POST Gifts); the table maps them to the version 1 names.

 | 

 | Field
 | Type
 | V1 field / Description

 | id
 | integer
 | key

 | gift_list_header_id
 | integer
 | The ID of the giftlist this gift belongs to

 | location_id
 | string (5 characters)
 | location

 | status_id
 | string (5 characters)
 | status

 | pickup_by_id
 | string (5 characters)
 | pickupby

 | stock_status_id
 | string (5 characters)
 | stockstatus

 | item_id
 | integer
 | product

 | unique_product_id
 | integer
 | Unique product ids are not used except under very specific circumstances. More information will be given on a need to know basis for this field

 | gift_list_line
 | integer
 | line

 | customer_sold_id
 | integer
 | buyer_id

 | receipt_header_sold_id
 | integer
 | ticket

 | point_of_sale_sold_id
 | string (max 4 characters)
 | The POS ID where the gift was purchased

 | customer_sold_name
 | string
 | buyer_name

 | description
 | string
 | product_desc

 | date_sold
 | date
 | sales_date

 | gross_amount
 | numeric
 | total

 | discount_amount
 | numeric
 | discount

 | net_amount
 | numeric
 | due

 | remark
 | string
 | remark

 | is_online
 | boolean
 | online

 | must_buy
 | boolean
 | mustbuy

 | created_by_user_id
 | string (4 characters)
 | The ID of the user that created this gift

 | updated_by_user_id
 | string (4 characters)
 | The ID of the user that most recently updated the list

 | created_at_date
 | date
 | created

 | updated_at_date
 | date
 | modified

 | updated_at
 | timestamp
 | modified

 | date_2
 | date
 | date2

 | date_3
 | date
 | date3

 | date_4
 | date
 | date4

 | miscellaneous_3
 | string
 | text3

 | miscellaneous_4
 | string
 | text4

 | miscellaneous_5
 | string
 | text5

 | miscellaneous_6
 | string
 | text6

 | miscellaneous_7
 | string
 | text7

 | miscellaneous_8
 | string
 | text8

 | miscellaneous_9
 | string
 | text9

 | pre_deliver
 | boolean
 | pre_deliver

 | status_2_id
 | string (5 characters)
 | status2

 | status_3_id
 | string (5 characters)
 | status3

 | gift_list_header.*
 | object
 | The giftlist object that the gift belongs to

 | gift_list_header.status.*
 | object
 | The status of the giftlist the gift belongs to

 | gift_list_header.created_by_user.*
 | object
 | The user object of the user that created the gift

 | gift_list_header.updated_by_user.*
 | object
 | The user object of the user that most recently updated the gift

 | location.*
 | object
 | An object with more information about the location of the gift

 | status.*
 | object
 | An object with more information about the status of the gift

 | status_2.*
 | object
 | An object with more information about the status 2 of the gift

 | status_3.*
 | object
 | An object with more information about the status 3 of the gift

 | pickup_by.*
 | object
 | An object with more information about who is picking up the gift (after the gift is purchased)

 | stock_status.*
 | object
 | An object with more information about the stock status of the gift

 | product.*
 | object
 | An object with more information about the product that is being gifted

 | cheque.*
 | object
 | An object with the cheque details in case the gift is a cheque

 | customer_sold.*
 | object
 | An object with all information on the customer that purchased the gift

 | receipt_header_sold.*
 | object
 | An object with all information about the receipt header where the gift was purchased

 | receipt_header_sold.receipt_items.*
 | array
 | An array with all articles that were purchased on the receipt where the gift was purchased

 | point_of_sale_sold.*
 | object
 | An object with more information about the POS where the gift was purchased

 | created_by_user.*
 | object
 | An object with more information on the user that created the gift

 | updated_by_user.*
 | object
 | An object with more information on the user that most recently updated the gift
Example response `Gift_list_items` (200):
```json
[
    {
        "id": 1,
        "gift_list_header_id": 1,
        "location_id": "01700",
        "status_id": "01500",
        "pickup_by_id": "",
        "stock_status_id": "01800",
        "item_id": 10000301030102,
        "unique_product_id": 0,
        "gift_list_line": 1,
        "customer_sold_id": 9,
        "receipt_header_sold_id": 0,
        "point_of_sale_sold_id": "",
        "customer_sold_name": "",
        "description": "Heren Kleding SoftTouch",
        "date_sold": "2024-10-28",
        "gross_amount": 19.95,
        "discount_amount": 0,
        "net_amount": 19.95,
        "remark": null,
        "is_online": true,
        "must_buy": false,
        "created_by_user_id": "1001",
        "updated_by_user_id": "1001",
        "created_at_date": "2024-10-28",
        "updated_at_date": "2024-10-28",
        "updated_at": "2024-10-28 14:20:49",
        "date_2": "2024-10-28",
        "date_3": "2024-10-28",
        "date_4": "2024-10-28"
    },
    {
        "id": 2,
        "gift_list_header_id": 2,
        "location_id": "01700",
        "status_id": "01502",
        "pickup_by_id": "01601",
        "stock_status_id": "01802",
        "item_id": 10000301030101,
        "unique_product_id": 0,
        "gift_list_line": 1,
        "customer_sold_id": 9,
        "receipt_header_sold_id": 1000000002,
        "point_of_sale_sold_id": "",
        "customer_sold_name": "Uncle John",
        "description": "This is a description.",
        "date_sold": "2024-10-30",
        "gross_amount": 100,
        "discount_amount": 25,
        "net_amount": 75,
        "remark": null,
        "is_online": true,
        "must_buy": false,
        "created_by_user_id": "",
        "updated_by_user_id": "1001",
        "created_at_date": "2024-10-31",
        "updated_at_date": "2024-11-07",
        "updated_at": "2024-11-07 08:59:53",
        "date_2": "2024-10-31",
        "date_3": "2024-10-31",
        "date_4": "2024-10-31"
    }
]
```

##### GET Gift_list_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/gift_list_items/1`
Fetches one gift by its id, with the same `select` options and return values as the list call.

When to use it: to re-read a gift after it was bought or updated.
Example response `Gift_list_items/{{id}}` (200):
```json
{
    "id": 1,
    "gift_list_header_id": 1,
    "location_id": "01700",
    "status_id": "01500",
    "pickup_by_id": "",
    "stock_status_id": "01800",
    "item_id": 10000301030102,
    "unique_product_id": 0,
    "gift_list_line": 1,
    "customer_sold_id": 9,
    "receipt_header_sold_id": 0,
    "point_of_sale_sold_id": "",
    "customer_sold_name": "",
    "description": "Heren Kleding SoftTouch",
    "date_sold": "2024-10-28",
    "gross_amount": 19.95,
    "discount_amount": 0,
    "net_amount": 19.95,
    "remark": null,
    "is_online": true,
    "must_buy": false,
    "created_by_user_id": "1001",
    "updated_by_user_id": "1001",
    "created_at_date": "2024-10-28",
    "updated_at_date": "2024-10-28",
    "updated_at": "2024-10-28 14:20:49",
    "date_2": "2024-10-28",
    "date_3": "2024-10-28",
    "date_4": "2024-10-28"
}
```

### V2 / Intrastat
#### Introduction

Intrastat codes are the combined nomenclature (CN) codes the client uses for its articles: the 8-digit commodity codes needed for Intrastat declarations and customs documents. The list is maintained per client in FasMan. This resource requires FasMan database version 318 or higher.

##### GET Intrastat
`https://api.softtouch.eu/2/accounts/{{accountId}}/intrastat?active=1`
Lists the Intrastat (CN) codes of the client.

When to use it: from customs, shipping or accounting integrations that need the commodity code and its description per language, for example to fill the customs data of a parcel that leaves the EU. Fetch the list once a day and cache it.

 | 

 | name
 | type
 | 

 | cn
 | string
 | comma separated CN codes

 | active
 | boolean
 | only (in)active codes

 | select
 | string
 | the fields to return, default all

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier

- cn: the CN code

- description_nl, description_fr, description_en: the description per language

- active: whether the code is in use

- created_at, updated_at: audit fields
Example response `Intrastat` (200):
```json
[
    {
        "id": 1,
        "cn": "61091000",
        "description_nl": "T-shirts en onderlijfjes van katoen",
        "description_fr": "T-shirts et maillots de corps en coton",
        "description_en": "T-shirts, singlets and other vests of cotton",
        "active": true,
        "created_at": "2025-03-04 10:12:00",
        "updated_at": "2025-03-04 10:12:00"
    },
    {
        "id": 2,
        "cn": "62034231",
        "description_nl": "Lange broeken van katoen, denim, voor heren",
        "description_fr": "Pantalons en coton, denim, pour hommes",
        "description_en": "Men's trousers of cotton denim",
        "active": true,
        "created_at": "2025-03-04 10:12:00",
        "updated_at": "2025-03-04 10:12:00"
    }
]
```

### V2 / Looks
#### Introduction

A look is an outfit: a set of articles that are presented together, with photos and a text, for example "Summer look 2026" with a jacket, trousers and a pair of shoes. Shops compose looks in FasMan; a web shop shows them as inspiration pages and links each item to its product page.

A look consists of four resources, each with its own endpoint:

 | 

 | Resource
 | Contents

 | Looks
 | the header: titles in three languages, categories (code1 – code7, the same categories as products), validity period, online flags per channel, active

 | Look_items
 | the articles in the look: `barbody` (article id) and `kleurnr` (variant)

 | Look_photos
 | the photos, with a type and a sort order

 | Look_text
 | the texts, with a type and a sort order

The header can return its items, photos and texts in one call through `select`, for example `select=*,lookItems.*,lookPhotos.*,lookText.*`.

Looks are read-only through the API. This endpoint requires FasMan database version 307 or higher.

##### GET Looks
`{{url}}/2/accounts/{{accountId}}/looks`
Lists looks. Filter on `active` and `date` to get the looks that should be shown today. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Use it to build inspiration or shop the look pages: fetch the active looks for today and your channel, with `select=*,lookItems.*,lookPhotos.*,lookText.*` to get everything in one call, and link each item to its product page.

 | 

 | name
 | type
 | 

 | active
 | boolean
 | 

 | date
 | date
 | YYYY-MM-DD; only looks whose period (look_from – look_to) includes this date

 | online
 | integer
 | 1 – 5; only looks that are online on this web shop channel

 | select
 | string
 | fields and relations: lookItems, lookPhotos, lookText

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the look

- title_nl, title_fr, title_en: the title per language

- code1 … code7: the categories of the look, same meaning as the product categories

- online, online2 … online5: shown on web shop channel 1 – 5

- look_from, look_to: the period in which the look is shown

- active: whether the look is in use

- sort: sort order

- created_at, updated_at: timestamps
Example response `Looks (select=*,lookItems.*)` (200):
```json
[
    {
        "id": 664,
        "title_nl": "Zomerlook 2026",
        "title_fr": "Look été 2026",
        "title_en": "Summer look 2026",
        "code1": "0102",
        "code2": "",
        "code3": "",
        "code4": "",
        "code5": "",
        "code6": "",
        "code7": "",
        "online": true,
        "online2": true,
        "online3": true,
        "online4": true,
        "online5": true,
        "look_from": "2025-12-22",
        "look_to": "2030-12-27",
        "active": true,
        "created_at": "2025-12-22 12:28:26",
        "updated_at": "2025-12-22 12:28:26",
        "sort": 1,
        "lookItems": [
            {
                "id": 2265,
                "look_id": 664,
                "barbody": 236839,
                "kleurnr": 1,
                "sort": 1,
                "created_at": "2025-12-22 12:28:26",
                "updated_at": "2025-12-22 12:28:26"
            }
        ]
    }
]
```

##### GET Looks/{{id}}
`{{url}}/2/accounts/{{accountId}}/looks/{{id}}`
Fetches one look by its id. The return values are the same as in the list call; use `select` to include the items, photos and texts.

When to use it: Use it for the detail page of one look.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | select
 | string
 |
Example response `Looks/{{id}}` (200):
```json
{
    "id": 664,
    "title_nl": "Zomerlook 2026",
    "title_fr": "Look été 2026",
    "title_en": "Summer look 2026",
    "code1": "0102",
    "code2": "",
    "code3": "",
    "code4": "",
    "code5": "",
    "code6": "",
    "code7": "",
    "online": true,
    "online2": true,
    "online3": true,
    "online4": true,
    "online5": true,
    "look_from": "2025-12-22",
    "look_to": "2030-12-27",
    "active": true,
    "created_at": "2025-12-22 12:28:26",
    "updated_at": "2025-12-22 12:28:26",
    "sort": 1
}
```

##### GET Look_items
`{{url}}/2/accounts/{{accountId}}/look_items`
Lists the items of all looks. Each item is one article in a look. To get the items of one look, ask the look with `select=*,lookItems.*` instead. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Use it when you synchronise looks in bulk and prefer flat lists over nested data; otherwise fetch the items through the look with `select`.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the item

- look_id: the look

- barbody: the article id (6 digits)

- kleurnr: the variant

- sort: sort order in the look

- created_at, updated_at: timestamps
Example response `Look_items` (200):
```json
[
    {
        "id": 2265,
        "look_id": 664,
        "barbody": 236839,
        "kleurnr": 1,
        "sort": 1,
        "created_at": "2025-12-22 12:28:26",
        "updated_at": "2025-12-22 12:28:26"
    },
    {
        "id": 2264,
        "look_id": 663,
        "barbody": 236837,
        "kleurnr": 1,
        "sort": 1,
        "created_at": "2025-12-22 12:27:10",
        "updated_at": "2025-12-22 12:27:10"
    }
]
```

##### GET Look_items/{{id}}
`{{url}}/2/accounts/{{accountId}}/look_items/{{id}}`
Fetches one look item by its id. The return values are the same as in the list call.

When to use it: Rarely needed; use it to re-read one item.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `Look_items/{{id}}` (200):
```json
{
    "id": 2265,
    "look_id": 664,
    "barbody": 236839,
    "kleurnr": 1,
    "sort": 1,
    "created_at": "2025-12-22 12:28:26",
    "updated_at": "2025-12-22 12:28:26"
}
```

##### GET Look_photos
`{{url}}/2/accounts/{{accountId}}/look_photos`
Lists the photos of all looks. The file name refers to the photo on the SoftTouch photo server of the client. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Use it when you synchronise looks in bulk; the file names point to the photos on the client's SoftTouch photo server.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the photo

- look_id: the look

- type: the photo type (file preset), e.g. 01

- sort: sort order

- filename: the file name of the photo

- created_at, updated_at: timestamps
Example response `Look_photos` (200):
```json
[
    {
        "id": 1209,
        "look_id": 665,
        "type": "01",
        "sort": 1,
        "filename": "665_20260513_MODEMAKERS-2-.webp",
        "created_at": "2026-05-21 14:29:26",
        "updated_at": "2026-05-21 14:29:26"
    }
]
```

##### GET Look_photos/{{id}}
`{{url}}/2/accounts/{{accountId}}/look_photos/{{id}}`
Fetches one look photo by its id. The return values are the same as in the list call.

When to use it: Rarely needed; use it to re-read one photo.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `Look_photos/{{id}}` (200):
```json
{
    "id": 1209,
    "look_id": 665,
    "type": "01",
    "sort": 1,
    "filename": "665_20260513_MODEMAKERS-2-.webp",
    "created_at": "2026-05-21 14:29:26",
    "updated_at": "2026-05-21 14:29:26"
}
```

##### GET Look_text
`{{url}}/2/accounts/{{accountId}}/look_text`
Lists the texts of all looks. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Use it when you synchronise looks in bulk and want the texts as a flat list.

 | 

 | name
 | type
 | 

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the text

- look_id: the look

- type: the text type (text preset), e.g. 02

- sort: sort order

- text: the text

- created_at, updated_at: timestamps
Example response `Look_text` (200):
```json
[
    {
        "id": 310,
        "look_id": 664,
        "type": "02",
        "sort": 1,
        "text": "Light and airy: a linen jacket over a cotton dress.",
        "created_at": "2025-12-22 12:30:02",
        "updated_at": "2025-12-22 12:30:02"
    }
]
```

##### GET Look_text/{{id}}
`{{url}}/2/accounts/{{accountId}}/look_text/{{id}}`
Fetches one look text by its id. The return values are the same as in the list call.

When to use it: Rarely needed; use it to re-read one text.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required
Example response `Look_text/{{id}}` (200):
```json
{
    "id": 310,
    "look_id": 664,
    "type": "02",
    "sort": 1,
    "text": "Light and airy: a linen jacket over a cotton dress.",
    "created_at": "2025-12-22 12:30:02",
    "updated_at": "2025-12-22 12:30:02"
}
```

### V2 / Receipt_headers
#### Introduction

The version 2 read view on receipts (see Receipts in version 1 for creating them), built for web shop order fulfilment: the header with its amounts per payment type, and the lines with, for each line, the customer order status, the store the line is assigned to (`assign_to`) and the pick `location`. The `assigned_to` filter lists exactly the open web shop lines a store has to handle, the way the web shop module of FasMan and MyFasMan Mobile see them.

`process_status` on the header summarises the lines: `5000` when every article line is present (status 31101), otherwise the number of lines being handled. split_lines turns lines with a quantity above 1 into lines of one piece. Requires FasMan database version 300 or higher.

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`. Relations: `point_of_sale`, `store`, `user`, `customer`, `customer_postal_code` (and `.country`), `invoice_address`, `delivery_address`, `receipt_items` (all lines) and `receipt_web_items` (only the open web shop article lines, with `receipt_web_items.product`). Extra field: `id_per_point_of_sale`.

##### GET Receipt_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/receipt_headers`
Lists receipts, newest first. Like every list call, the result is limited to 500 records per call.

Two modes:

- Fulfilment mode with `assigned_to` (a store id): returns the receipts that still have unprocessed web shop lines assigned to that store (or created in that store and not assigned elsewhere). All other filters except `is_processed` are ignored, and `receipt_web_items` and `process_status` are limited to that store's lines.

- Filter mode without `assigned_to`: dates, stores, customers, addresses, tracking numbers and remarks. `is_processed` always restricts the result to web shop orders.

When to use it: to build a fulfilment screen for a store (`assigned_to`, `select=*,receipt_web_items.product,customer,delivery_address`), or to find the receipt of a web order by tracking number or by the reference you wrote in `remark`.

 | 

 | name
 | type
 | 

 | assigned_to
 | string
 | store id, fulfilment mode

 | is_processed
 | boolean
 | web shop orders that are (not) processed

 | id
 | integer
 | one receipt number

 | from_date, to_date
 | date
 | 

 | period
 | array
 | two dates, `period[]=…&period[]=…`

 | store_ids, point_of_sale_ids, user_ids
 | string
 | comma separated

 | customer_ids, customer_postal_code_ids, invoice_address_ids, delivery_address_ids
 | string
 | comma separated

 | tracking_numbers
 | string
 | comma separated exact tracking numbers

 | remarks
 | string
 | comma separated exact remarks

 | select
 | string
 | `*`, plus relations

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the receipt number

- point_of_sale_id, store_id, user_id

- customer_id, customer_postal_code_id, invoice_address_id, delivery_address_id

- date, time, seal, tracking_number, remark

- gross_amount, discount_amount, net_amount, paid_amount

- payment_type_1_amount … payment_type_30_amount: the amount per payment type

- process_status: 5000 when all article lines are present, else the number of lines being handled

- is_processed: the web shop order was processed

- receipt_items / receipt_web_items (with select): the lines, each with item_id (product key), quantity, unit_price, discount_amount, net_amount, vat_percentage, description, item_type_id (00100 article, 00106 shipping costs, …), `customer_order_status` (or null), `assign_to` (the store that handles the line, NA when not assigned) and `location` (pick location)
Example response `Receipt_headers` (200):
```json
[
    {
        "id": 2010000564,
        "point_of_sale_id": "0201",
        "store_id": "02",
        "user_id": "0001",
        "customer_id": 4711,
        "customer_postal_code_id": 3021,
        "invoice_address_id": 0,
        "delivery_address_id": 77,
        "date": "2026-09-14",
        "time": "09:15",
        "seal": "",
        "tracking_number": "323210001234567890",
        "remark": "WEB-88123",
        "gross_amount": 129.9,
        "discount_amount": 0,
        "net_amount": 129.9,
        "paid_amount": 129.9,
        "payment_type_1_amount": 0,
        "payment_type_2_amount": 0,
        "payment_type_3_amount": 129.9,
        "payment_type_4_amount": 0,
        "payment_type_5_amount": 0,
        "payment_type_6_amount": 0,
        "payment_type_7_amount": 0,
        "payment_type_8_amount": 0,
        "payment_type_9_amount": 0,
        "payment_type_10_amount": 0,
        "payment_type_11_amount": 0,
        "payment_type_12_amount": 0,
        "payment_type_13_amount": 0,
        "payment_type_14_amount": 0,
        "payment_type_15_amount": 0,
        "payment_type_16_amount": 0,
        "payment_type_17_amount": 0,
        "payment_type_18_amount": 0,
        "payment_type_19_amount": 0,
        "payment_type_20_amount": 0,
        "payment_type_21_amount": 0,
        "payment_type_22_amount": 0,
        "payment_type_23_amount": 0,
        "payment_type_24_amount": 0,
        "payment_type_25_amount": 0,
        "payment_type_26_amount": 0,
        "payment_type_27_amount": 0,
        "payment_type_28_amount": 0,
        "payment_type_29_amount": 0,
        "payment_type_30_amount": 0,
        "process_status": 5000,
        "is_processed": false,
        "receipt_web_items": [
            {
                "id": 4410021,
                "receipt_header_id": 2010000564,
                "receipt_line": 1,
                "point_of_sale_id": "0201",
                "store_id": "02",
                "user_id": "0001",
                "user_sold_id": "0001",
                "customer_id": 4711,
                "item_id": 55556101040102,
                "unique_product_id": null,
                "discount_type_id": 0,
                "item_type_id": "00100",
                "date": "2026-09-14",
                "customer_order_status": {
                    "id": 640,
                    "receipt_header_id": 2010000564,
                    "receipt_line": 1,
                    "reservation_header_id": null,
                    "reservation_line": null,
                    "transfer_request_header_id": null,
                    "transfer_request_item_id": null,
                    "transfer_header_id": null,
                    "transfer_item_id": null,
                    "type_id": "31001",
                    "status_id": "31101",
                    "endpoint_store_id": "02",
                    "created_by_user_id": "0001",
                    "updated_by_user_id": "0001",
                    "created_at": "2026-09-14 10:15:32",
                    "updated_at": "2026-09-14 10:15:32"
                },
                "quantity": 1,
                "unit_price": 99.95,
                "discount_amount": 0,
                "net_amount": 99.95,
                "vat_percentage": 21,
                "description": "Red t-shirt short sleeve L",
                "on_customer_card": true,
                "customer_card_percentage": 0,
                "customer_card_value": 0,
                "discount_allowed": true,
                "art_external_order_status": 0,
                "assign_to": "02",
                "location": "A-12-03",
                "product": {
                    "key": 55556101040102,
                    "description": "Red t-shirt short sleeve",
                    "stock": 3
                }
            }
        ]
    }
]
```

##### GET Receipt_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/receipt_headers/2010000564`
Fetches one receipt with, when selected, its lines and their customer order statuses.

When to use it: for the detail of a web shop order in a fulfilment or customer service tool.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the receipt number

 | select
 | string
 | e.g. `*,receipt_items,customer,delivery_address`
Example response `Receipt_headers/{{id}}` (200):
```json
{
    "id": 2010000564,
    "point_of_sale_id": "0201",
    "store_id": "02",
    "user_id": "0001",
    "customer_id": 4711,
    "customer_postal_code_id": 3021,
    "invoice_address_id": 0,
    "delivery_address_id": 77,
    "date": "2026-09-14",
    "time": "09:15",
    "seal": "",
    "tracking_number": "323210001234567890",
    "remark": "WEB-88123",
    "gross_amount": 129.9,
    "discount_amount": 0,
    "net_amount": 129.9,
    "paid_amount": 129.9,
    "payment_type_1_amount": 0,
    "payment_type_2_amount": 0,
    "payment_type_3_amount": 129.9,
    "payment_type_4_amount": 0,
    "payment_type_5_amount": 0,
    "payment_type_6_amount": 0,
    "payment_type_7_amount": 0,
    "payment_type_8_amount": 0,
    "payment_type_9_amount": 0,
    "payment_type_10_amount": 0,
    "payment_type_11_amount": 0,
    "payment_type_12_amount": 0,
    "payment_type_13_amount": 0,
    "payment_type_14_amount": 0,
    "payment_type_15_amount": 0,
    "payment_type_16_amount": 0,
    "payment_type_17_amount": 0,
    "payment_type_18_amount": 0,
    "payment_type_19_amount": 0,
    "payment_type_20_amount": 0,
    "payment_type_21_amount": 0,
    "payment_type_22_amount": 0,
    "payment_type_23_amount": 0,
    "payment_type_24_amount": 0,
    "payment_type_25_amount": 0,
    "payment_type_26_amount": 0,
    "payment_type_27_amount": 0,
    "payment_type_28_amount": 0,
    "payment_type_29_amount": 0,
    "payment_type_30_amount": 0,
    "process_status": 5000,
    "is_processed": false,
    "receipt_items": [
        {
            "id": 4410021,
            "receipt_header_id": 2010000564,
            "receipt_line": 1,
            "point_of_sale_id": "0201",
            "store_id": "02",
            "user_id": "0001",
            "user_sold_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040102,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": {
                "id": 640,
                "receipt_header_id": 2010000564,
                "receipt_line": 1,
                "reservation_header_id": null,
                "reservation_line": null,
                "transfer_request_header_id": null,
                "transfer_request_item_id": null,
                "transfer_header_id": null,
                "transfer_item_id": null,
                "type_id": "31001",
                "status_id": "31101",
                "endpoint_store_id": "02",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            },
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 0,
            "net_amount": 99.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0,
            "assign_to": "02",
            "location": "A-12-03"
        },
        {
            "id": 4410022,
            "receipt_header_id": 2010000564,
            "receipt_line": 2,
            "point_of_sale_id": "0201",
            "store_id": "02",
            "user_id": "0001",
            "user_sold_id": "0001",
            "customer_id": 4711,
            "item_id": 99999999999999,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00106",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 29.95,
            "discount_amount": 0,
            "net_amount": 29.95,
            "vat_percentage": 21,
            "description": "Shipping costs",
            "on_customer_card": false,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": false,
            "art_external_order_status": 0,
            "assign_to": "NA",
            "location": ""
        }
    ]
}
```

##### POST Receipt_headers/{{id}}/split_lines
`https://api.softtouch.eu/2/accounts/{{accountId}}/receipt_headers/2010000564/split_lines`
Splits every line with a quantity above 1 into lines of one piece, cent-exact (discount and totals are divided, the sum stays the same), and does the same in the customer history. Header totals do not change. Safe to call twice.

When to use it: before you create customer order statuses or transfer requests for a web shop order with quantities above 1, so each piece can be assigned, located and transferred on its own. Transfer_request_headers/generate does this automatically.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 | 

The response is the receipt with its lines after the split.
Example response `Receipt_headers/{{id}}/split_lines` (200):
```json
{
    "id": 2010000564,
    "point_of_sale_id": "0201",
    "store_id": "02",
    "user_id": "0001",
    "customer_id": 4711,
    "customer_postal_code_id": 3021,
    "invoice_address_id": 0,
    "delivery_address_id": 77,
    "date": "2026-09-14",
    "time": "09:15",
    "seal": "",
    "tracking_number": "323210001234567890",
    "remark": "WEB-88123",
    "gross_amount": 129.9,
    "discount_amount": 0,
    "net_amount": 129.9,
    "paid_amount": 129.9,
    "payment_type_1_amount": 0,
    "payment_type_2_amount": 0,
    "payment_type_3_amount": 129.9,
    "payment_type_4_amount": 0,
    "payment_type_5_amount": 0,
    "payment_type_6_amount": 0,
    "payment_type_7_amount": 0,
    "payment_type_8_amount": 0,
    "payment_type_9_amount": 0,
    "payment_type_10_amount": 0,
    "payment_type_11_amount": 0,
    "payment_type_12_amount": 0,
    "payment_type_13_amount": 0,
    "payment_type_14_amount": 0,
    "payment_type_15_amount": 0,
    "payment_type_16_amount": 0,
    "payment_type_17_amount": 0,
    "payment_type_18_amount": 0,
    "payment_type_19_amount": 0,
    "payment_type_20_amount": 0,
    "payment_type_21_amount": 0,
    "payment_type_22_amount": 0,
    "payment_type_23_amount": 0,
    "payment_type_24_amount": 0,
    "payment_type_25_amount": 0,
    "payment_type_26_amount": 0,
    "payment_type_27_amount": 0,
    "payment_type_28_amount": 0,
    "payment_type_29_amount": 0,
    "payment_type_30_amount": 0,
    "process_status": 5000,
    "is_processed": false,
    "receipt_items": [
        {
            "id": 4410021,
            "receipt_header_id": 2010000564,
            "receipt_line": 1,
            "point_of_sale_id": "0201",
            "store_id": "02",
            "user_id": "0001",
            "user_sold_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040102,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": {
                "id": 640,
                "receipt_header_id": 2010000564,
                "receipt_line": 1,
                "reservation_header_id": null,
                "reservation_line": null,
                "transfer_request_header_id": null,
                "transfer_request_item_id": null,
                "transfer_header_id": null,
                "transfer_item_id": null,
                "type_id": "31001",
                "status_id": "31101",
                "endpoint_store_id": "02",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            },
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 0,
            "net_amount": 99.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0,
            "assign_to": "02",
            "location": "A-12-03"
        },
        {
            "id": 4410022,
            "receipt_header_id": 2010000564,
            "receipt_line": 2,
            "point_of_sale_id": "0201",
            "store_id": "02",
            "user_id": "0001",
            "user_sold_id": "0001",
            "customer_id": 4711,
            "item_id": 99999999999999,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00106",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 29.95,
            "discount_amount": 0,
            "net_amount": 29.95,
            "vat_percentage": 21,
            "description": "Shipping costs",
            "on_customer_card": false,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": false,
            "art_external_order_status": 0,
            "assign_to": "NA",
            "location": ""
        },
        {
            "id": 4410023,
            "receipt_header_id": 2010000564,
            "receipt_line": 3,
            "point_of_sale_id": "0201",
            "store_id": "02",
            "user_id": "0001",
            "user_sold_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040102,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 0,
            "net_amount": 99.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0,
            "assign_to": "02",
            "location": "A-12-03"
        }
    ]
}
```

##### PATCH Receipt_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/receipt_items/4410021`
Sets the pick location of one receipt line, the free text the fulfilment screen shows next to the article (shelf, box, rack). Nothing else on a line can be changed through this call; the id is the line id returned in `receipt_items`, not the line number.

When to use it: from a warehouse system that knows where the piece is stored, so the store finds it quickly.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the line id

 | location
 | string
 | required

 | select
 | string
 | `*`, plus `product`, `receipt_header`, `customer`

The response is the updated line.
Request body:
```
{
    "location": "A-12-03"
}
```
Example response `Receipt_items/{{id}}` (200):
```json
{
    "id": 4410021,
    "receipt_header_id": 2010000564,
    "receipt_line": 1,
    "point_of_sale_id": "0201",
    "store_id": "02",
    "user_id": "0001",
    "user_sold_id": "0001",
    "customer_id": 4711,
    "item_id": 55556101040102,
    "unique_product_id": null,
    "discount_type_id": 0,
    "item_type_id": "00100",
    "date": "2026-09-14",
    "customer_order_status": null,
    "quantity": 1,
    "unit_price": 99.95,
    "discount_amount": 0,
    "net_amount": 99.95,
    "vat_percentage": 21,
    "description": "Red t-shirt short sleeve L",
    "on_customer_card": true,
    "customer_card_percentage": 0,
    "customer_card_value": 0,
    "discount_allowed": true,
    "art_external_order_status": 0,
    "assign_to": "02",
    "location": "A-12-03"
}
```

### V2 / Reservation_headers
#### Introduction

The version 2 read view on reservations (see Reservations in version 1 for creating them): the header with its amounts per payment type, and the lines with, for each line, the customer order status that tells where the piece is (present, in transfer request, in transfer, processed). Two actions complete the web shop order flow: split_lines turns lines with a quantity above 1 into lines of one piece, so every piece can be followed separately; process flips the processed flag of a reservation without creating a receipt.

`process_status` on the header summarises the lines: `5000` when every article line is present (status 31101), otherwise the number of lines that are being handled. Requires FasMan database version 305 or higher.

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`. Relations: `point_of_sale`, `store`, `user`, `customer`, `invoice_address`, `delivery_address`, `reservation_items` (all lines) and `reservation_web_items` (only sellable article lines, without the barcodes in program variable `WebshopScreenIgnoreBarcodes`); on items `product`, `unique_product`, `customer`.

For drop-ship orders at the supplier see Supplier_data (POST Reservation_headers/supplier_data).

##### GET Reservation_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/reservation_headers`
Lists reservations. Like every list call, the result is limited to 500 records per call.

When to use it: to list the open web shop orders of a store (`store_ids`, `is_processed=0`), to find the reservation of a web order by the reference you wrote in `remarks`, or to find every reservation that holds a given article (`product_prefix`).

 | 

 | name
 | type
 | 

 | is_processed
 | boolean
 | 

 | from_date, to_date
 | date
 | reservation date from / to

 | period
 | array
 | two dates, `period[]=2026-09-01&period[]=2026-09-30`

 | store_ids, point_of_sale_ids, user_ids
 | string
 | comma separated

 | customer_ids, invoice_address_ids, delivery_address_ids
 | string
 | comma separated

 | remarks
 | string
 | comma separated exact remarks

 | product_prefix
 | integer
 | the first 8 digits of a product key (article + colour): reservations holding any size of it

 | select
 | string
 | `*`, plus relations

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the reservation number

- point_of_sale_id, store_id, user_id: where and by whom it was made

- customer_id, invoice_address_id, delivery_address_id, gift_list_header_id

- status_1_id, status_2_id, status_3_id: client specific statuses

- date, time, remark

- is_processed: the reservation was turned into a sale

- create_invoice_when_processed

- gross_amount, discount_amount, net_amount, paid_amount

- payment_type_1_amount … payment_type_30_amount: the amount per payment type

- updated_at

- process_status: 5000 when all article lines are present, else the number of lines being handled

- reservation_items (with select): the lines, each with item_id (product key), quantity, unit_price, discount_amount, net_amount, vat_percentage, description, discount_type_id, item_type_id, on_customer_card, discount_allowed, art_external_order_status and `customer_order_status` (the follow-up status of the line, or null)
Example response `Reservation_headers` (200):
```json
[
    {
        "id": 999100002,
        "point_of_sale_id": "0101",
        "store_id": "01",
        "user_id": "0001",
        "customer_id": 4711,
        "invoice_address_id": 0,
        "delivery_address_id": 77,
        "gift_list_header_id": null,
        "status_1_id": null,
        "status_2_id": null,
        "status_3_id": null,
        "date": "2026-09-14",
        "time": "10:02",
        "remark": "Web order 2026-1234",
        "is_processed": false,
        "create_invoice_when_processed": false,
        "gross_amount": 149.9,
        "discount_amount": 15,
        "net_amount": 134.9,
        "paid_amount": 134.9,
        "payment_type_1_amount": 0,
        "payment_type_2_amount": 134.9,
        "payment_type_3_amount": 0,
        "payment_type_4_amount": 0,
        "payment_type_5_amount": 0,
        "payment_type_6_amount": 0,
        "payment_type_7_amount": 0,
        "payment_type_8_amount": 0,
        "payment_type_9_amount": 0,
        "payment_type_10_amount": 0,
        "payment_type_11_amount": 0,
        "payment_type_12_amount": 0,
        "payment_type_13_amount": 0,
        "payment_type_14_amount": 0,
        "payment_type_15_amount": 0,
        "payment_type_16_amount": 0,
        "payment_type_17_amount": 0,
        "payment_type_18_amount": 0,
        "payment_type_19_amount": 0,
        "payment_type_20_amount": 0,
        "payment_type_21_amount": 0,
        "payment_type_22_amount": 0,
        "payment_type_23_amount": 0,
        "payment_type_24_amount": 0,
        "payment_type_25_amount": 0,
        "payment_type_26_amount": 0,
        "payment_type_27_amount": 0,
        "payment_type_28_amount": 0,
        "payment_type_29_amount": 0,
        "payment_type_30_amount": 0,
        "updated_at": "2026-09-14 10:02:15",
        "process_status": 1
    }
]
```

##### GET Reservation_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/reservation_headers/999100002`
Fetches one reservation with, when selected, its lines and their customer order statuses.

When to use it: for the order detail page of the web shop or a back-office tool, where the state of every piece matters.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL, the reservation number

 | select
 | string
 | e.g. `*,reservation_items,delivery_address,customer`
Example response `Reservation_headers/{{id}}` (200):
```json
{
    "id": 999100002,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "user_id": "0001",
    "customer_id": 4711,
    "invoice_address_id": 0,
    "delivery_address_id": 77,
    "gift_list_header_id": null,
    "status_1_id": null,
    "status_2_id": null,
    "status_3_id": null,
    "date": "2026-09-14",
    "time": "10:02",
    "remark": "Web order 2026-1234",
    "is_processed": false,
    "create_invoice_when_processed": false,
    "gross_amount": 149.9,
    "discount_amount": 15,
    "net_amount": 134.9,
    "paid_amount": 134.9,
    "payment_type_1_amount": 0,
    "payment_type_2_amount": 134.9,
    "payment_type_3_amount": 0,
    "payment_type_4_amount": 0,
    "payment_type_5_amount": 0,
    "payment_type_6_amount": 0,
    "payment_type_7_amount": 0,
    "payment_type_8_amount": 0,
    "payment_type_9_amount": 0,
    "payment_type_10_amount": 0,
    "payment_type_11_amount": 0,
    "payment_type_12_amount": 0,
    "payment_type_13_amount": 0,
    "payment_type_14_amount": 0,
    "payment_type_15_amount": 0,
    "payment_type_16_amount": 0,
    "payment_type_17_amount": 0,
    "payment_type_18_amount": 0,
    "payment_type_19_amount": 0,
    "payment_type_20_amount": 0,
    "payment_type_21_amount": 0,
    "payment_type_22_amount": 0,
    "payment_type_23_amount": 0,
    "payment_type_24_amount": 0,
    "payment_type_25_amount": 0,
    "payment_type_26_amount": 0,
    "payment_type_27_amount": 0,
    "payment_type_28_amount": 0,
    "payment_type_29_amount": 0,
    "payment_type_30_amount": 0,
    "updated_at": "2026-09-14 10:02:15",
    "process_status": 1,
    "reservation_items": [
        {
            "id": 90311,
            "reservation_header_id": 999100002,
            "reservation_line": 1,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "user_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040101,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": {
                "id": 501,
                "receipt_header_id": null,
                "receipt_line": null,
                "reservation_header_id": 999100002,
                "reservation_line": 1,
                "transfer_request_header_id": 1240,
                "transfer_request_item_id": 5610,
                "transfer_header_id": null,
                "transfer_item_id": null,
                "type_id": "31001",
                "status_id": "31105",
                "endpoint_store_id": "01",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            },
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 10,
            "net_amount": 89.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0
        },
        {
            "id": 90312,
            "reservation_header_id": 999100002,
            "reservation_line": 2,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "user_id": "0001",
            "customer_id": 4711,
            "item_id": 55556201030101,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 49.95,
            "discount_amount": 5,
            "net_amount": 44.95,
            "vat_percentage": 21,
            "description": "Blue t-shirt short sleeve M",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0
        }
    ]
}
```

##### POST Reservation_headers/{{id}}/split_lines
`https://api.softtouch.eu/2/accounts/{{accountId}}/reservation_headers/999100002/split_lines`
Splits every line with a quantity above 1 into lines of one piece; discount and totals are divided over the new lines, header totals do not change. Safe to call twice: a second call finds nothing to split.

When to use it: before you create customer order statuses or transfer requests for a web shop order with quantities above 1, so each physical piece has its own line and can be picked, transferred and processed on its own. Transfer_request_headers/generate does this automatically.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 | 

The response is the reservation with its lines after the split.
Example response `Reservation_headers/{{id}}/split_lines` (200):
```json
{
    "id": 999100002,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "user_id": "0001",
    "customer_id": 4711,
    "invoice_address_id": 0,
    "delivery_address_id": 77,
    "gift_list_header_id": null,
    "status_1_id": null,
    "status_2_id": null,
    "status_3_id": null,
    "date": "2026-09-14",
    "time": "10:02",
    "remark": "Web order 2026-1234",
    "is_processed": false,
    "create_invoice_when_processed": false,
    "gross_amount": 149.9,
    "discount_amount": 15,
    "net_amount": 134.9,
    "paid_amount": 134.9,
    "payment_type_1_amount": 0,
    "payment_type_2_amount": 134.9,
    "payment_type_3_amount": 0,
    "payment_type_4_amount": 0,
    "payment_type_5_amount": 0,
    "payment_type_6_amount": 0,
    "payment_type_7_amount": 0,
    "payment_type_8_amount": 0,
    "payment_type_9_amount": 0,
    "payment_type_10_amount": 0,
    "payment_type_11_amount": 0,
    "payment_type_12_amount": 0,
    "payment_type_13_amount": 0,
    "payment_type_14_amount": 0,
    "payment_type_15_amount": 0,
    "payment_type_16_amount": 0,
    "payment_type_17_amount": 0,
    "payment_type_18_amount": 0,
    "payment_type_19_amount": 0,
    "payment_type_20_amount": 0,
    "payment_type_21_amount": 0,
    "payment_type_22_amount": 0,
    "payment_type_23_amount": 0,
    "payment_type_24_amount": 0,
    "payment_type_25_amount": 0,
    "payment_type_26_amount": 0,
    "payment_type_27_amount": 0,
    "payment_type_28_amount": 0,
    "payment_type_29_amount": 0,
    "payment_type_30_amount": 0,
    "updated_at": "2026-09-14 10:02:15",
    "process_status": 1,
    "reservation_items": [
        {
            "id": 90311,
            "reservation_header_id": 999100002,
            "reservation_line": 1,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "user_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040101,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 10,
            "net_amount": 89.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0
        },
        {
            "id": 90313,
            "reservation_header_id": 999100002,
            "reservation_line": 3,
            "point_of_sale_id": "0101",
            "store_id": "01",
            "user_id": "0001",
            "customer_id": 4711,
            "item_id": 55556101040101,
            "unique_product_id": null,
            "discount_type_id": 0,
            "item_type_id": "00100",
            "date": "2026-09-14",
            "customer_order_status": null,
            "quantity": 1,
            "unit_price": 99.95,
            "discount_amount": 10,
            "net_amount": 89.95,
            "vat_percentage": 21,
            "description": "Red t-shirt short sleeve L",
            "on_customer_card": true,
            "customer_card_percentage": 0,
            "customer_card_value": 0,
            "discount_allowed": true,
            "art_external_order_status": 0
        }
    ]
}
```

##### POST Reservation_headers/{{id}}/process
`https://api.softtouch.eu/2/accounts/{{accountId}}/reservation_headers/999100002/process`
Marks a reservation as processed (`process: true`) or reopens it (`process: false`). Processing sets the processed flag and releases the reserved stock by setting the line quantities to 0; reopening restores them. No receipt is created and payments are not touched: use Reservations/process (v1) when the sale has to be finalised in FasMan.

When to use it: when the order was handled outside FasMan and the reservation only has to be closed, or to reopen a reservation that was closed by mistake.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | process
 | boolean
 | required

 | select
 | string
 | 

The response is the reservation header.
Request body:
```
{
    "process": true
}
```
Example response `Reservation_headers/{{id}}/process` (200):
```json
{
    "id": 999100002,
    "point_of_sale_id": "0101",
    "store_id": "01",
    "user_id": "0001",
    "customer_id": 4711,
    "invoice_address_id": 0,
    "delivery_address_id": 77,
    "gift_list_header_id": null,
    "status_1_id": null,
    "status_2_id": null,
    "status_3_id": null,
    "date": "2026-09-14",
    "time": "10:02",
    "remark": "Web order 2026-1234",
    "is_processed": true,
    "create_invoice_when_processed": false,
    "gross_amount": 149.9,
    "discount_amount": 15,
    "net_amount": 134.9,
    "paid_amount": 134.9,
    "payment_type_1_amount": 0,
    "payment_type_2_amount": 134.9,
    "payment_type_3_amount": 0,
    "payment_type_4_amount": 0,
    "payment_type_5_amount": 0,
    "payment_type_6_amount": 0,
    "payment_type_7_amount": 0,
    "payment_type_8_amount": 0,
    "payment_type_9_amount": 0,
    "payment_type_10_amount": 0,
    "payment_type_11_amount": 0,
    "payment_type_12_amount": 0,
    "payment_type_13_amount": 0,
    "payment_type_14_amount": 0,
    "payment_type_15_amount": 0,
    "payment_type_16_amount": 0,
    "payment_type_17_amount": 0,
    "payment_type_18_amount": 0,
    "payment_type_19_amount": 0,
    "payment_type_20_amount": 0,
    "payment_type_21_amount": 0,
    "payment_type_22_amount": 0,
    "payment_type_23_amount": 0,
    "payment_type_24_amount": 0,
    "payment_type_25_amount": 0,
    "payment_type_26_amount": 0,
    "payment_type_27_amount": 0,
    "payment_type_28_amount": 0,
    "payment_type_29_amount": 0,
    "payment_type_30_amount": 0,
    "updated_at": "2026-09-14 10:02:15",
    "process_status": 1
}
```

### V2 / Returns
#### Introduction

A return in FasMan is goods that leave the stock as a return to the supplier: damaged articles, wrong deliveries, unsold goods taken back. A return has a header (date, optional customer, statuses, remark) and items (product, quantity, reason code, statuses), and photos can be attached to an item as evidence for the supplier. Creating a return reduces the stock of the products and writes a return movement with the purchase price in the stock history. It does not create a receipt, a credit note or a cheque.

A customer who brings an article back is not a return in this sense: that is a receipt with a negative quantity (see Receipts), which refunds the customer and puts the piece back in stock.

Statuses come from the code table (see Code_values): header status 1 is group 210 (21000 OPEN, 21001 PROCESSED, 21009 DELETED), item status 1 is group 215 (21500 OPEN, 21504 PROCESSED, 21509 DELETED); the other status groups (211, 212, 216, 217) are client specific. Reason codes are the client's own list. Requires FasMan database version 300 or higher (312 for photos).

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`. Relations for a return: `customer`, `status1`, `status2`, `status3`, `created_by_user`, `updated_by_user`, `return_items` and nested `return_items.product`, `.unique_product`, `.return_code`, `.status1`. Relations for an item: the same plus `return_header`.

##### GET Returns
`https://api.softtouch.eu/2/accounts/{{accountId}}/returns`
Lists returns, newest last. There are no filters; page with `take` and `skip` (max. 500 records per call) and add `select=*,return_items` for the lines.

When to use it: to export returns to a purchasing or supplier portal, or to show a back-office overview.

 | 

 | name
 | type
 | 

 | select
 | string
 | `*`, plus relations, e.g. `*,return_items.product,status1`

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the return number

- customer_id: the customer, 0 when none

- status_1_id, status_2_id, status_3_id: statuses, see the folder description

- date: the return date

- remark

- created_by_user_id, updated_by_user_id, updated_at
Example response `Returns` (200):
```json
[
    {
        "id": 118,
        "customer_id": 0,
        "status_1_id": "21000",
        "status_2_id": "",
        "status_3_id": "",
        "date": "2026-09-10",
        "remark": "Defect zipper, return to supplier",
        "created_by_user_id": "1113",
        "updated_by_user_id": "1113",
        "updated_at": "2026-09-10 14:21:07"
    }
]
```

##### GET Returns/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/returns/118`
Fetches one return; add `select=*,return_items` for its lines.

When to use it: for the detail of one return, with its lines, in a supplier portal or back-office tool.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 |
Example response `Returns/{{id}}` (200):
```json
{
    "id": 118,
    "customer_id": 0,
    "status_1_id": "21000",
    "status_2_id": "",
    "status_3_id": "",
    "date": "2026-09-10",
    "remark": "Defect zipper, return to supplier",
    "created_by_user_id": "1113",
    "updated_by_user_id": "1113",
    "updated_at": "2026-09-10 14:21:07",
    "return_items": [
        {
            "id": 501,
            "return_header_id": 118,
            "return_line": 1,
            "return_code_id": 3,
            "customer_id": 0,
            "product_id": 55556101040101,
            "unique_product_id": 0,
            "status_1_id": "21500",
            "status_2_id": "",
            "status_3_id": "",
            "date": "2026-09-10",
            "quantity": 2,
            "remark": "zipper broken",
            "created_by_user_id": "1113",
            "updated_by_user_id": "1113",
            "updated_at": "2026-09-10 14:21:07"
        }
    ]
}
```

##### POST Returns
`https://api.softtouch.eu/2/accounts/{{accountId}}/returns`
Creates a return with its items and takes the quantities out of stock immediately (stock and delivered counters go down, the returned counter goes up), with a return movement at purchase price in the stock history. Every item is either a product (14-digit key) or a unique product (12-digit key), never both; unique products must be in stock and not in a transfer.

When to use it: from a warehouse or purchasing tool that sends goods back to a supplier and wants FasMan's stock to follow. Use a negative quantity on a second return to reverse a mistake.

 | 

 | name
 | type
 | 

 | date
 | date
 | default today

 | customer_id
 | integer
 | when the return concerns a customer's article

 | remark
 | string
 | 

 | status_1_id, status_2_id, status_3_id
 | string
 | length 5, from the header status groups; default 21000

 | point_of_sale_id_processed
 | string
 | length 4, the register written in the stock history

 | history_module
 | string
 | length 3, default API

 | user_id
 | string
 | length 4, default the API user

 | items
 | array
 | required

 | items[].product_id
 | integer
 | 14-digit product key; either product_id or unique_product_id

 | items[].unique_product_id
 | integer
 | 12-digit unique product key

 | items[].quantity
 | integer
 | required, not 0

 | items[].return_code_id
 | integer
 | the reason code

 | items[].remark
 | string
 | 

 | items[].status_1_id, status_2_id, status_3_id
 | string
 | length 5, from the item status groups; default 21500

The response is the created return; add `select=*,return_items` to see the lines with their ids (needed for photos).
Request body:
```
{
    "date": "2026-09-10",
    "remark": "Defect zipper, return to supplier",
    "point_of_sale_id_processed": "0101",
    "items": [
        {
            "product_id": 55556101040101,
            "quantity": 2,
            "return_code_id": 3,
            "remark": "zipper broken"
        }
    ]
}
```
Example response `Returns` (200):
```json
{
    "id": 119,
    "customer_id": 0,
    "status_1_id": "21000",
    "status_2_id": "",
    "status_3_id": "",
    "date": "2026-09-10",
    "remark": "Defect zipper, return to supplier",
    "created_by_user_id": "1113",
    "updated_by_user_id": "1113",
    "updated_at": "2026-09-10 14:21:07",
    "return_items": [
        {
            "id": 501,
            "return_header_id": 119,
            "return_line": 1,
            "return_code_id": 3,
            "customer_id": 0,
            "product_id": 55556101040101,
            "unique_product_id": 0,
            "status_1_id": "21500",
            "status_2_id": "",
            "status_3_id": "",
            "date": "2026-09-10",
            "quantity": 2,
            "remark": "zipper broken",
            "created_by_user_id": "1113",
            "updated_by_user_id": "1113",
            "updated_at": "2026-09-10 14:21:07"
        }
    ]
}
```

##### GET Return_items
`https://api.softtouch.eu/2/accounts/{{accountId}}/return_items`
Lists return items across returns. There are no filters; page with `take` and `skip` (max. 500 records per call).

When to use it: for reports per product or per reason code across all returns; for the lines of one return use Returns/{{id}} with `select`.

 | 

 | name
 | type
 | 

 | select
 | string
 | `*`, plus relations such as `product`, `return_code`, `return_header`, `status1`

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier of the line

- return_header_id, return_line: the return and the line number

- return_code_id: the reason code, 0 when none

- customer_id

- product_id, unique_product_id: the article (unique_product_id 0 when not unique)

- status_1_id, status_2_id, status_3_id

- date, quantity, remark

- created_by_user_id, updated_by_user_id, updated_at
Example response `Return_items` (200):
```json
[
    {
        "id": 501,
        "return_header_id": 118,
        "return_line": 1,
        "return_code_id": 3,
        "customer_id": 0,
        "product_id": 55556101040101,
        "unique_product_id": 0,
        "status_1_id": "21500",
        "status_2_id": "",
        "status_3_id": "",
        "date": "2026-09-10",
        "quantity": 2,
        "remark": "zipper broken",
        "created_by_user_id": "1113",
        "updated_by_user_id": "1113",
        "updated_at": "2026-09-10 14:21:07"
    }
]
```

##### GET Return_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/return_items/501`
Fetches one return item.

When to use it: to re-read one return line, for example to get its reason code and photos.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 | e.g. `*,return_code,product`
Example response `Return_items/{{id}}` (200):
```json
{
    "id": 501,
    "return_header_id": 118,
    "return_line": 1,
    "return_code_id": 3,
    "customer_id": 0,
    "product_id": 55556101040101,
    "unique_product_id": 0,
    "status_1_id": "21500",
    "status_2_id": "",
    "status_3_id": "",
    "date": "2026-09-10",
    "quantity": 2,
    "remark": "zipper broken",
    "created_by_user_id": "1113",
    "updated_by_user_id": "1113",
    "updated_at": "2026-09-10 14:21:07",
    "return_code": {
        "id": 3,
        "description": "Damaged",
        "is_active": true
    }
}
```

##### GET Return_images
`https://api.softtouch.eu/2/accounts/{{accountId}}/return_images`
Lists the photos attached to return items, without the image data. Add `photo` to `select` to receive the base64 image of each record; do that per record, not for the whole list. Requires FasMan database version 312 or higher.

When to use it: to know which photos exist for the items of a return, before fetching them one by one.

 | 

 | name
 | type
 | 

 | select
 | string
 | `*`, or `*,photo` for the image data

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier

- return_item_id: the return item the photo belongs to

- sort: display order

- name: the file name

- created_by_user_id, updated_by_user_id, created_at, updated_at

- photo (with select): the image, base64 encoded
Example response `Return_images` (200):
```json
[
    {
        "id": 7,
        "return_item_id": 501,
        "sort": 0,
        "name": "zipper_front.jpg",
        "created_by_user_id": "1113",
        "updated_by_user_id": "1113",
        "created_at": "2026-09-10 14:25:40",
        "updated_at": "2026-09-10 14:25:40"
    }
]
```

##### GET Return_images/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/return_images/7`
Fetches one photo; with `select=*,photo` the base64 image data is included.

When to use it: to download one photo (with `select=*,photo`) for the supplier.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 | `*,photo` for the image
Example response `Return_images/{{id}}` (200):
```json
{
    "id": 7,
    "return_item_id": 501,
    "sort": 0,
    "name": "zipper_front.jpg",
    "created_by_user_id": "1113",
    "updated_by_user_id": "1113",
    "created_at": "2026-09-10 14:25:40",
    "updated_at": "2026-09-10 14:25:40",
    "photo": "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/…"
}
```

##### POST Return_images
`https://api.softtouch.eu/2/accounts/{{accountId}}/return_images`
Attaches a photo to a return item. The image is sent base64 encoded in `photo` and stored in the client's database; the base64 string may be at most 65 536 characters (about 48 KB of image), so resize before uploading.

When to use it: right after creating the return, with the item ids from the response, when the supplier wants evidence of the damage.

 | 

 | name
 | type
 | 

 | return_item_id
 | integer
 | required, the return item

 | name
 | string
 | required, file name (max. 50 characters)

 | sort
 | integer
 | display order, default 0

 | photo
 | string
 | required, base64 encoded image, max. 65 536 characters

 | user_id
 | string
 | length 4

The response is the created record without the image data.
Request body:
```
{
    "return_item_id": 501,
    "name": "zipper_front.jpg",
    "sort": 1,
    "photo": "/9j/4AAQSkZJRgABAQEASABIAAD/…"
}
```
Example response `Return_images` (200):
```json
{
    "id": 8,
    "return_item_id": 501,
    "sort": 1,
    "name": "zipper_front.jpg",
    "created_by_user_id": "1113",
    "updated_by_user_id": "1113",
    "created_at": "2026-09-10 14:25:40",
    "updated_at": "2026-09-10 14:25:40"
}
```

### V2 / Supplier_data
#### Introduction

Some brands share their own stock with the shops that sell them, and accept orders for articles the shop does not have in stock (drop-shipping). The SoftTouch API connects to those suppliers (Stockbase, Van de Velde, Fashion Cloud, Marie Méro, Caroline Biss, …) so a web shop can:

- show the supplier stock of an article next to the shop's own stock, and sell it when the shop is out of stock;

- place the order at the supplier once the customer has bought such an article, so the supplier ships it.

Whether a brand supports this, and through which provider, is visible in Brand_attribute_values (attribute 5 for stock, 9 for orders). The connections themselves are configured by SoftTouch per client.

Supplier stock is cached: the API keeps the quantities it received in the FasMan database and only asks the supplier again for EANs it has not seen recently (FasMan database version 316 or higher).

This endpoint requires FasMan database version 300 or higher.

##### GET Stock/supplier_data
`{{url}}/2/accounts/{{accountId}}/stock/supplier_data?brand_id=193&article_eans=5400508495035,5400508495028,5400508494724,5400508495011`
Returns the stock the supplier has for the given EANs of a brand. Without EANs the complete stock feed of the brand is returned, which can be large; prefer asking for the EANs you display. The call is available as GET (parameters in the query) and as POST (parameters in the body, for long lists of EANs).

When to use it: Use it on the product page or at checkout when the shop's own stock of a size is 0: ask the supplier stock for the EANs of the article and, when the supplier has it, keep the size sellable. Combine it with Reservation_headers/supplier_data to place the order at the supplier after the sale. Only for brands with a stock provider (Brand_attribute_values, attribute 5).

 | 

 | name
 | type
 | 

 | brand_id
 | string
 | required, length 3; the brand must be active and have a stock provider

 | article_eans
 | string / array
 | comma separated (GET) or array (POST) of EANs, max. 13 digits each

 | return_all_eans
 | boolean
 | true also returns the EANs the supplier did not report, with quantity 0

 | force_fetch
 | boolean
 | true ignores the cached quantities and asks the supplier for every EAN

A brief explanation of the return values:

- ean: the barcode

- quantity: the quantity the supplier can deliver

A brand without stock provider results in a `400` error; a supplier that cannot be reached results in a `500` error with the message of the supplier.
Example response `Stock/supplier_data` (200):
```json
[
    {
        "ean": "5400508495035",
        "quantity": 12
    },
    {
        "ean": "5400508495028",
        "quantity": 0
    },
    {
        "ean": "5400508494724",
        "quantity": 3
    },
    {
        "ean": "5400508495011",
        "quantity": 7
    }
]
```

##### POST Reservation_headers/supplier_data
`{{url}}/2/accounts/{{accountId}}/reservation_headers/supplier_data`
Places an order at the supplier for articles a customer bought that the shop cannot deliver from its own stock. The supplier ships directly to the customer. The provider is decided by the brand of the first EAN (Brand_attribute_values, attribute 9); the shop's identification at the supplier (GLN) is taken from the store of the order, which the API looks up with `order_id` in the reservations, receipts and customer orders of the client.

When to use it: Use it after a customer bought an article that was only available at the supplier: create the order in FasMan as usual (receipt, reservation or customer order), then call this endpoint with that order id and the customer's delivery address so the supplier ships it directly. Use `is_test: true` while developing.

 | 

 | name
 | type
 | 

 | order_id
 | string
 | required, the id of the reservation, receipt or customer order in FasMan; used to find the store and as reference at the supplier

 | first_name, last_name
 | string
 | required, the customer

 | company
 | string
 | 

 | email
 | string
 | required

 | street, street_number
 | string
 | required

 | street_number_addition
 | string
 | 

 | zip, city
 | string
 | required

 | country
 | string
 | required, ISO country code, e.g. BE

 | items
 | array
 | required, min. 1

 | items[].EAN
 | string
 | required, max. 13 digits

 | items[].quantity
 | integer
 | required

 | items[].price
 | numeric
 | required, the selling price

 | items[].product_id
 | integer
 | the 14-digit product uid in FasMan

 | items[].description
 | string
 | 

 | is_test
 | boolean
 | true validates and stores the request without sending it to the supplier

Every request is logged in FasMan (external orders) before it is sent. The response depends on the provider: Stockbase returns `{"message": "success."}`; Van de Velde returns the supplier order created in FasMan. A brand without order provider, or an order whose store cannot be determined, results in a `400` error.
Request body:
```
{
    "first_name": "Jane",
    "last_name": "Doe",
    "company": "",
    "email": "jane.doe@example.com",
    "street": "Ambachtenlaan",
    "street_number": "6",
    "street_number_addition": "A",
    "zip": "9080",
    "city": "Lochristi",
    "country": "BE",
    "order_id": "999107050",
    "items": [
        {
            "EAN": "5414356649793",
            "quantity": 1,
            "price": 269
        }
    ],
    "is_test": true
}
```
Example response `Reservation_headers/supplier_data` (200):
```json
{
    "message": "success."
}
```

### V2 / Transfer_request_headers
#### Introduction

A transfer request asks another store to send goods: the requesting store needs an article it does not have, the providing store has it in stock. The request has a header (the two stores, a status, the customer and the web shop order it was made for) and one item per piece (the product key in the providing store, a status). Once the providing store confirms, a transfer is created and the goods travel; the customer order status of the web shop line follows every step.

This is the version 2 view on the same data as Transfer requests (v1), with the names of version 2, `select` for relations, and two workflows that version 1 does not have:

- generate: give a reservation, a receipt or a product, and the API works out which stores have the pieces available and creates the requests for you, one per providing store.

- process: the providing store confirms or refuses each piece and, optionally, the transfer is created and the stock moves in one call.

Header statuses (group 240): 24000 requested, 24001 printed by the providing store, 24002 confirmed, 24003 printed by the requesting store, 24004 validated, 24005 closed, 24009 deleted. Item statuses (group 250): 25000 requested, 25001 confirmed, 25002 not OK, 25003 OK, 25009 deleted. The default status of a new header is program variable `TransferRequestDefaultStatus` of the requesting store, or 24000. Requires FasMan database version 300 or higher.

Version 2 list calls accept `select` (fields and relations, default `*`), `take` (max. 500) and `skip`. Relations: `requesting_store`, `providing_store`, `status`, `customer`, `transfer_header` (and `transfer_header.transfer_items`), `reservation_header` (and `.reservation_items`, `.customer`), `receipt_header` (and `.receipt_items`, `.customer`), `created_by_user`, `updated_by_user`, `transfer_request_items` (and `.status`, `.product`, `.unique_product`).

##### GET Transfer_request_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers`
Lists transfer requests. Like every list call, the result is limited to 500 records per call.

When to use it: to show a store what it has to send (`providing_store_ids` + `status_ids=24000`), to follow the requests of a web shop order (`reservation_header_ids`), or to build a dashboard of open requests. Add `select=*,transfer_request_items` for the pieces.

 | 

 | name
 | type
 | 

 | requesting_store_ids
 | string
 | comma separated store ids

 | providing_store_ids
 | string
 | comma separated store ids

 | status_ids
 | string
 | comma separated header statuses (240xx)

 | customer_ids
 | string
 | comma separated customer numbers

 | transfer_header_ids
 | string
 | comma separated transfer numbers

 | reservation_header_ids
 | string
 | comma separated reservation numbers (requests generated from a receipt cannot be filtered this way)

 | select
 | string
 | `*`, plus relations

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

Ids in the filters must exist; an unknown id returns a validation error.

A brief explanation of the return values:

- id: the request number

- ean_13_code: the barcode of the request (998100000000 + id, with check digit), printed on the request ticket and used by App_notification

- requesting_store_id: the store that needs the goods

- providing_store_id: the store that should send them

- status_id: 240xx, see the folder description

- customer_id: the customer the goods are for, or null

- transfer_header_id: the transfer number once the goods were sent, or null

- reservation_header_id: the reservation or receipt number the request was generated from, or null

- remark

- created_by_user_id, updated_by_user_id, deleted_at, created_at, updated_at
Example response `Transfer_request_headers` (200):
```json
[
    {
        "id": 1240,
        "ean_13_code": 9981000012404,
        "requesting_store_id": "01",
        "providing_store_id": "02",
        "status_id": "24000",
        "customer_id": 4711,
        "transfer_header_id": null,
        "reservation_header_id": 999100002,
        "remark": "Web order 2026-1234",
        "created_by_user_id": "0001",
        "updated_by_user_id": "0001",
        "deleted_at": null,
        "created_at": "2026-09-14 10:15:32",
        "updated_at": "2026-09-14 10:15:32",
        "transfer_request_items": [
            {
                "id": 5610,
                "transfer_request_header_id": 1240,
                "transfer_request_line": 1,
                "status_id": "25000",
                "product_id": 55556101040102,
                "remark": "",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "deleted_at": null,
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            },
            {
                "id": 5611,
                "transfer_request_header_id": 1240,
                "transfer_request_line": 2,
                "status_id": "25000",
                "product_id": 55556201030102,
                "remark": "",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "deleted_at": null,
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            }
        ]
    }
]
```

##### GET Transfer_request_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers/1240`
Fetches one transfer request.

When to use it: after generate, to follow the request: the header status says whether the providing store confirmed, `transfer_header_id` is filled once the goods were sent, and the item statuses say which pieces were OK.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 | e.g. `*,transfer_request_items.product,providing_store`
Example response `Transfer_request_headers/{{id}}` (200):
```json
{
    "id": 1240,
    "ean_13_code": 9981000012404,
    "requesting_store_id": "01",
    "providing_store_id": "02",
    "status_id": "24000",
    "customer_id": 4711,
    "transfer_header_id": null,
    "reservation_header_id": 999100002,
    "remark": "Web order 2026-1234",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32",
    "transfer_request_items": [
        {
            "id": 5610,
            "transfer_request_header_id": 1240,
            "transfer_request_line": 1,
            "status_id": "25000",
            "product_id": 55556101040102,
            "remark": "",
            "created_by_user_id": "0001",
            "updated_by_user_id": "0001",
            "deleted_at": null,
            "created_at": "2026-09-14 10:15:32",
            "updated_at": "2026-09-14 10:15:32"
        }
    ]
}
```

##### POST Transfer_request_headers/generate
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers/generate`
Creates the transfer requests a web shop order (or one product) needs, based on the available stock in the other stores. Give one of `reservation_header_id`, `receipt_header_id` or `product_id`; the API does the rest and returns the created requests, one per providing store. An empty array means nothing had to be requested: the requesting store has the pieces itself, or no store has them.

When to use it: right after creating a web shop order in a store that does not hold all the articles: call generate with the reservation or receipt number, then notify the providing stores (App_notification with action `transfer_request` and the `ean_13_code` of each request). Use `product_id` for a single piece a customer asks for in the store. Prefer this call over building requests yourself with POST: it applies the client's availability rules and links the order lines.

 | 

 | name
 | type
 | 

 | reservation_header_id
 | integer
 | the reservation number; must not be processed yet

 | receipt_header_id
 | integer
 | the receipt number of the web shop order

 | product_id
 | integer
 | the 14-digit product key in the requesting store, for one piece

 | customer_id
 | integer
 | overrides the customer of the order; may not be the default customer

 | remark
 | string
 | written on every generated request

 | user_id
 | string
 | length 4, default the API user

 | select
 | string
 | e.g. `*,transfer_request_items`

What happens, step by step

- The requesting store is the store of the order (or of the product); the customer is the one given or the one of the order. When the client requires customer details on transfer requests (program variables `TransferRequestKlantVeld…`), the customer must have them, otherwise a 400 error tells which field is missing.

- For a reservation or receipt, every line with a quantity above 1 is first split into lines of one piece (see split_lines in Reservation_headers and Receipt_headers), because each piece gets its own request item and its own customer order status.

- The wanted pieces are the article lines of the order (item type 00100; vouchers, shipping costs and other special lines are skipped).

- For each article the API looks for the same article, colour and size in all stores with available stock (stock minus reservations, gift lists and customer orders; the order's own reservation does not block). Program variables of the requesting store steer this: `TransferRequestAvailabilityStoreIds` limits the candidate stores, `TransferRequestAvailabilityOrder` sets the preference (store id, store sort order, sell-through, largest stock first, …), and barcodes in `WebshopScreenIgnoreBarcodes` are ignored. The requesting store itself is always tried first.

- Pieces the requesting store has itself generate nothing; every other store that supplies pieces gets one request with one item per piece, status 24000 (or the client's default) and items 25000.

- For a reservation or receipt, each order line is linked to its request item with a Customer order status 31105 (in transfer request); from then on the line follows the request and the transfer.

No notification is sent by this call; send the App_notification yourself. Nothing is written when validation fails. A 400 error is returned for a processed reservation, an unknown or inactive product, a default customer, or when more than one source id is given.

The response is the array of generated requests.
Request body:
```
{
    "reservation_header_id": 999100002,
    "remark": "Web order 2026-1234"
}
```
Example response `Transfer_request_headers/generate` (200):
```json
[
    {
        "id": 1240,
        "ean_13_code": 9981000012404,
        "requesting_store_id": "01",
        "providing_store_id": "02",
        "status_id": "24000",
        "customer_id": 4711,
        "transfer_header_id": null,
        "reservation_header_id": 999100002,
        "remark": "Web order 2026-1234",
        "created_by_user_id": "0001",
        "updated_by_user_id": "0001",
        "deleted_at": null,
        "created_at": "2026-09-14 10:15:32",
        "updated_at": "2026-09-14 10:15:32",
        "transfer_request_items": [
            {
                "id": 5610,
                "transfer_request_header_id": 1240,
                "transfer_request_line": 1,
                "status_id": "25000",
                "product_id": 55556101040102,
                "remark": "",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "deleted_at": null,
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            },
            {
                "id": 5611,
                "transfer_request_header_id": 1240,
                "transfer_request_line": 2,
                "status_id": "25000",
                "product_id": 55556201030102,
                "remark": "",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "deleted_at": null,
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            }
        ]
    },
    {
        "id": 1241,
        "ean_13_code": 9981000012411,
        "requesting_store_id": "01",
        "providing_store_id": "03",
        "status_id": "24000",
        "customer_id": 4711,
        "transfer_header_id": null,
        "reservation_header_id": 999100002,
        "remark": "Web order 2026-1234",
        "created_by_user_id": "0001",
        "updated_by_user_id": "0001",
        "deleted_at": null,
        "created_at": "2026-09-14 10:15:32",
        "updated_at": "2026-09-14 10:15:32",
        "transfer_request_items": [
            {
                "id": 5612,
                "transfer_request_header_id": 1241,
                "transfer_request_line": 1,
                "status_id": "25000",
                "product_id": 55556101040103,
                "remark": "",
                "created_by_user_id": "0001",
                "updated_by_user_id": "0001",
                "deleted_at": null,
                "created_at": "2026-09-14 10:15:32",
                "updated_at": "2026-09-14 10:15:32"
            }
        ]
    }
]
```
Example response `Transfer_request_headers/generate (nothing to request)` (200):
```json
[]
```

##### POST Transfer_request_headers
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers`
Creates one transfer request by hand: you choose the providing store and list the pieces. Use generate when the request comes from a web shop order; use this call when you already know which store has to send.

When to use it: when a store or warehouse tool already knows which store has to send, for example a request typed in by the staff; for web shop orders use generate.

 | 

 | name
 | type
 | 

 | requesting_store_id
 | string
 | required, length 2, active store

 | providing_store_id
 | string
 | required, length 2, active store, different from the requesting store

 | customer_id
 | integer
 | the customer; required when program variable `TransferRequestSelectCustomer` is set for the requesting store; may not be the default customer

 | remark
 | string
 | 

 | user_id
 | string
 | length 4

 | items
 | array
 | required, min. 1, one entry per piece

 | items[].product_id
 | integer
 | required, the 14-digit product key in the providing store (the last two digits are the providing store id)

 | items[].remark
 | string
 | 

The response is the created request.
Request body:
```
{
    "requesting_store_id": "01",
    "providing_store_id": "02",
    "customer_id": 4711,
    "remark": "Customer waiting",
    "items": [
        {
            "product_id": 55556101040102
        },
        {
            "product_id": 55556101040102,
            "remark": "second piece"
        }
    ]
}
```
Example response `Transfer_request_headers` (200):
```json
{
    "id": 1242,
    "ean_13_code": 9981000012428,
    "requesting_store_id": "01",
    "providing_store_id": "02",
    "status_id": "24000",
    "customer_id": 4711,
    "transfer_header_id": null,
    "reservation_header_id": null,
    "remark": "Customer waiting",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32",
    "transfer_request_items": [
        {
            "id": 5620,
            "transfer_request_header_id": 1242,
            "transfer_request_line": 1,
            "status_id": "25000",
            "product_id": 55556101040102,
            "remark": "",
            "created_by_user_id": "0001",
            "updated_by_user_id": "0001",
            "deleted_at": null,
            "created_at": "2026-09-14 10:15:32",
            "updated_at": "2026-09-14 10:15:32"
        },
        {
            "id": 5621,
            "transfer_request_header_id": 1242,
            "transfer_request_line": 2,
            "status_id": "25000",
            "product_id": 55556101040102,
            "remark": "second piece",
            "created_by_user_id": "0001",
            "updated_by_user_id": "0001",
            "deleted_at": null,
            "created_at": "2026-09-14 10:15:32",
            "updated_at": "2026-09-14 10:15:32"
        }
    ]
}
```

##### POST Transfer_request_headers/{{id}}/process
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers/1240/process`
The providing store answers the request: every piece is marked OK (25003) or not OK (25002), the header becomes validated (24004), and with `generate_transfer: true` a transfer is created for the OK pieces in the same call: the stock moves from the providing store to the transfer, the transfer number is stored in `transfer_header_id`, and the customer order statuses of the linked order lines become 31106 (in transfer) for OK pieces and 31100 (to confirm) for refused ones.

When to use it: from a warehouse or store tool that handles requests outside MyFasMan Mobile. The request must be in status 24000, 24001 or 24002, and all items of the request must be in the call.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | items
 | array
 | required, every item of the request

 | items[].id
 | integer
 | required

 | items[].status_id
 | string
 | required, 25003 OK or 25002 not OK

 | generate_transfer
 | boolean
 | create the transfer for the OK pieces

 | providing_store_id
 | string
 | length 2; when given it must match the request unless force_if_store_conflict is true

 | force_if_store_conflict
 | boolean
 | 

 | user_id
 | string
 | length 4

The response is the validated request; `transfer_header_id` holds the new transfer number when one was created.
Request body:
```
{
    "generate_transfer": true,
    "items": [
        {
            "id": 5610,
            "status_id": "25003"
        },
        {
            "id": 5611,
            "status_id": "25002"
        }
    ]
}
```
Example response `Transfer_request_headers/{{id}}/process` (200):
```json
{
    "id": 1240,
    "ean_13_code": 9981000012404,
    "requesting_store_id": "01",
    "providing_store_id": "02",
    "status_id": "24004",
    "customer_id": 4711,
    "transfer_header_id": 2006000517,
    "reservation_header_id": 999100002,
    "remark": "Web order 2026-1234",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32",
    "transfer_request_items": [
        {
            "id": 5610,
            "transfer_request_header_id": 1240,
            "transfer_request_line": 1,
            "status_id": "25003",
            "product_id": 55556101040102,
            "remark": "",
            "created_by_user_id": "0001",
            "updated_by_user_id": "0001",
            "deleted_at": null,
            "created_at": "2026-09-14 10:15:32",
            "updated_at": "2026-09-14 10:15:32"
        },
        {
            "id": 5611,
            "transfer_request_header_id": 1240,
            "transfer_request_line": 2,
            "status_id": "25002",
            "product_id": 55556201030102,
            "remark": "",
            "created_by_user_id": "0001",
            "updated_by_user_id": "0001",
            "deleted_at": null,
            "created_at": "2026-09-14 10:15:32",
            "updated_at": "2026-09-14 10:15:32"
        }
    ]
}
```

##### PATCH Transfer_request_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers/1240`
Updates the status or the links of a request without any side effect on items, stock or order statuses. Use process for the normal workflow; use PATCH to correct a status or to link a transfer that was made another way.

When to use it: to correct a status by hand, or to link a transfer that was created outside the process call.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | status_id
 | string
 | length 5, an active header status (240xx)

 | transfer_header_id
 | integer
 | the transfer number

 | reservation_header_id
 | integer
 | a reservation number (not processed)

 | user_id
 | string
 | length 4

The response is the updated request.
Request body:
```
{
    "status_id": "24002"
}
```
Example response `Transfer_request_headers/{{id}}` (200):
```json
{
    "id": 1240,
    "ean_13_code": 9981000012404,
    "requesting_store_id": "01",
    "providing_store_id": "02",
    "status_id": "24002",
    "customer_id": 4711,
    "transfer_header_id": null,
    "reservation_header_id": 999100002,
    "remark": "Web order 2026-1234",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32"
}
```

##### DELETE Transfer_request_headers/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_headers/1240`
Deletes a request and its items (soft delete). The response is `true`.

When to use it: when the order behind the request was cancelled before the providing store sent the goods.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Transfer_request_headers/{{id}}` (200):
```json
true
```

### V2 / Transfer_request_items
#### Introduction

The pieces of a transfer request (see Transfer_request_headers): one item per piece, with the product key in the providing store and a status (25000 requested, 25001 confirmed, 25002 not OK, 25003 OK, 25009 deleted). Items are created through the header calls; here you list, read, correct or delete them. Requires FasMan database version 300 or higher.

Relations for `select`: `status`, `product`, `unique_product`, `created_by_user`, `updated_by_user`, `transfer_request_header` (and its `providing_store`, `requesting_store`, `status`, `customer`, `transfer_header`, `reservation_header`). Extra field: `unique_product_id`.

##### GET Transfer_request_items
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_items`
Lists request items. Like every list call, the result is limited to 500 records per call.

When to use it: for a pick list across requests (all pieces a store still has to confirm: `status_ids=25000`), or the pieces of one product.

 | 

 | name
 | type
 | 

 | transfer_request_header_ids
 | string
 | comma separated request numbers

 | status_ids
 | string
 | comma separated item statuses (250xx)

 | product_ids
 | string
 | comma separated 14-digit product keys

 | unique_product_ids
 | string
 | comma separated

 | select
 | string
 | `*`, plus relations such as `product`, `transfer_request_header`

 | take
 | integer
 | max. 500

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the item id

- transfer_request_header_id, transfer_request_line: the request and the line number

- status_id: 250xx

- product_id: the 14-digit product key in the providing store

- remark

- created_by_user_id, updated_by_user_id, deleted_at, created_at, updated_at

- unique_product_id (with select)
Example response `Transfer_request_items` (200):
```json
[
    {
        "id": 5610,
        "transfer_request_header_id": 1240,
        "transfer_request_line": 1,
        "status_id": "25000",
        "product_id": 55556101040102,
        "remark": "",
        "created_by_user_id": "0001",
        "updated_by_user_id": "0001",
        "deleted_at": null,
        "created_at": "2026-09-14 10:15:32",
        "updated_at": "2026-09-14 10:15:32",
        "product": {
            "key": 55556101040102,
            "description": "Red t-shirt short sleeve"
        }
    }
]
```

##### GET Transfer_request_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_items/5610`
Fetches one request item.

When to use it: to re-read one piece, for example when the store scans it.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | select
 | string
 |
Example response `Transfer_request_items/{{id}}` (200):
```json
{
    "id": 5610,
    "transfer_request_header_id": 1240,
    "transfer_request_line": 1,
    "status_id": "25000",
    "product_id": 55556101040102,
    "remark": "",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32"
}
```

##### PATCH Transfer_request_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_items/5610`
Sets the status of one item, without side effects on stock or order statuses (unlike process on the header).

When to use it: to correct the status of one piece outside the process workflow.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL

 | status_id
 | string
 | length 5, an active item status (250xx)

 | user_id
 | string
 | length 4

The response is the updated item.
Request body:
```
{
    "status_id": "25001"
}
```
Example response `Transfer_request_items/{{id}}` (200):
```json
{
    "id": 5610,
    "transfer_request_header_id": 1240,
    "transfer_request_line": 1,
    "status_id": "25001",
    "product_id": 55556101040102,
    "remark": "",
    "created_by_user_id": "0001",
    "updated_by_user_id": "0001",
    "deleted_at": null,
    "created_at": "2026-09-14 10:15:32",
    "updated_at": "2026-09-14 10:15:32"
}
```

##### DELETE Transfer_request_items/{{id}}
`https://api.softtouch.eu/2/accounts/{{accountId}}/transfer_request_items/5610`
Deletes one item (soft delete). When it was the last item, the request itself is deleted too. The response is `true`.

When to use it: when one piece of a request is no longer needed, for example after a partial cancellation.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required, in the URL
Example response `Transfer_request_items/{{id}}` (200):
```json
true
```

### V2 / Wash_instructions
#### Introduction

The master list of wash and care instructions: every symbol that can appear on the label of a garment, with its title and description in Dutch, French and English and the name of its icon. The list is maintained by SoftTouch and is the same for every client, but a client can deactivate the instructions it does not use.

Instructions are grouped by `kind`:

 | 

 | kind
 | Group

 | 56001
 | Washing

 | 56002
 | Bleaching

 | 56003
 | Drying

 | 56004
 | Ironing

 | 56005
 | Professional care

The link between an article and its instructions is a separate resource: Product_wash_instructions in API v1 returns, per article, the ids of the instructions that apply. Fetch this master list once, cache it, and look up the details of the ids you receive there.

The icons can be requested from SoftTouch. This endpoint requires FasMan database version 306 or higher.

The link between articles and their symbols is in Article_wash_instructions.

##### GET Wash_instructions
`{{url}}/2/accounts/{{accountId}}/wash_instructions`
Lists the wash and care instructions. Like every V2 list call, the result is limited to 500 records per call (default 100). Use `take` and `skip` to page. The `select` parameter chooses the fields and relations that are returned, for example `select=*,articleTextType.*`.

When to use it: Call it once when the integration starts and cache the result; it is the lookup table for the ids that Product_wash_instructions (v1) returns per article. Only re-fetch it when the client tells you they activated new instructions.

 | 

 | name
 | type
 | 

 | active
 | boolean
 | only (in)active instructions

 | select
 | string
 | fields and relations: userCreate, userModify

 | take
 | integer
 | max. 500, default 100

 | skip
 | integer
 | 

A brief explanation of the return values:

- id: the unique identifier, referred to by Product_wash_instructions

- kind: the group, see the folder description

- sort: sort order within the group

- title_nl, title_fr, title_en: the short name of the symbol

- description_nl, description_fr, description_en: the explanation

- image_name: the file name of the icon

- active: whether the client uses this instruction

- user_create, user_modify, created_at, updated_at: who and when
Example response `Wash_instructions` (200):
```json
[
    {
        "id": 1,
        "kind": "56001",
        "sort": 0,
        "title_nl": "Niet wassen",
        "title_fr": "Ne pas laver",
        "title_en": "Do not wash",
        "description_nl": "Artikelen die op deze manier zijn gemarkeerd, mogen niet worden gewassen.",
        "description_fr": "Les articles marqués de cette manière ne doivent pas être lavés.",
        "description_en": "Articles marked this way must not be washed.",
        "image_name": "donotwash.png",
        "active": true,
        "user_create": "1001",
        "user_modify": "1001",
        "created_at": "2020-12-11 12:53:43",
        "updated_at": "2020-12-11 12:53:43"
    },
    {
        "id": 2,
        "kind": "56001",
        "sort": 1,
        "title_nl": "Wassen op 30 °C",
        "title_fr": "Laver à 30 °C",
        "title_en": "Wash at 30 °C",
        "description_nl": "Machinewas op maximaal 30 °C.",
        "description_fr": "Lavage en machine à 30 °C maximum.",
        "description_en": "Machine wash at 30 °C maximum.",
        "image_name": "wash30.png",
        "active": true,
        "user_create": "1001",
        "user_modify": "1001",
        "created_at": "2020-12-11 12:53:43",
        "updated_at": "2020-12-11 12:53:43"
    }
]
```

##### GET Wash_instructions/{{id}}
`{{url}}/2/accounts/{{accountId}}/wash_instructions/1`
Fetches one wash and care instruction by its id. The return values are the same as in the list call.

When to use it: Use it when you receive an id that is not in your cached list.

 | 

 | name
 | type
 | 

 | id
 | integer
 | required

 | select
 | string
 |
Example response `Wash_instructions/{{id}}` (200):
```json
{
    "id": 1,
    "kind": "56001",
    "sort": 0,
    "title_nl": "Niet wassen",
    "title_fr": "Ne pas laver",
    "title_en": "Do not wash",
    "description_nl": "Artikelen die op deze manier zijn gemarkeerd, mogen niet worden gewassen.",
    "description_fr": "Les articles marqués de cette manière ne doivent pas être lavés.",
    "description_en": "Articles marked this way must not be washed.",
    "image_name": "donotwash.png",
    "active": true,
    "user_create": "1001",
    "user_modify": "1001",
    "created_at": "2020-12-11 12:53:43",
    "updated_at": "2020-12-11 12:53:43"
}
```