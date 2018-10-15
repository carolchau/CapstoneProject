# CapstoneProject

Cappies is a massively multiplayer online game. The vision of our project was to create a casual online experience for former ClubPenguin fans as well as people in search of a hop-in-hop-out world to explore with friends while also catering to the more dedicated MMO crowd by featuring rich systems in our game to yield a deeper, more involved experience. The pixelated art style was chosen for its simplicity and wide appeal and we targeted web and desktop as our two deployment platforms because they are the most traditional MMO platforms of release and because it was easier to achieve the personal goal set by us: to do as much from scratch as possible.

The game now features a deterministic procedurally generated 2D world with six biomes: sand, water, snow, jungle, swamp, and grass - a chat system for player communication, and randomly generated hats (20 types of hats) with a set rarity (probability) drop for each hat. Hats can be collected and stored in player inventory and worn.

### Folder Organization

    .
    ├── async_tasks             # Asynchronous tasks
    ├── config                  # Configuration files
    ├── docs                    # Documentation files
    ├── models                  # Schemas for mongoose
    ├── public                  # Static files
    |     ├── css               # Style sheets
    |     ├── img               # Game image assets
    |     |    ├── Creature     # Image assets for game AI
    |     |    └── Player       # Image assets for player
    |     └── js                # Client-side JavaScript files
    |          └── graphics     # JavaScript files for game
    ├── routes                  # Routes' files
    ├── test                    # Automated tests
    └── views                   # View template files

### How to start

Once you have cloned the repo, run `npm install` in project root to install project dependencies.

Then run `pip install python_requirements.txt`, followed by `python async_tasks/gen_chunk.py 1600 16 4000` from project root to generate all world chunks.

Lastly, to start the server, use `npm run start`, which runs the start script defined in *package.json*.
