# Getting Started with RedisAI for JavaScript

This tool loads a Mobilenet image classification model into RedisAI, takes a bunch of images that you provide on the command line and classifies them with it.

## Installation

Make sure you have Node installed and then clone this repo.

    $ git clone git@github.com:guyroyse/redisai-node-example.git

Once you do, just `npm install` from the root of the repo. Everything you need to run the example is in the repo, including some images.

## Usage

This is a simple CLI tool and there are already some images to play with in the `img` folder.

To classify an images, just run:

    $ npm start img/panda.jpg

It'll return the top 5 most likely classes for the images, including their scores:

    Setting the model to mobilenet
    Reading and resizing img/panda.jpg
    Normalizing image data
    Setting input tensor of shape [ 1, 224, 224, 3 ]
    Running model
    Reading output tensor of shape [ 1, 1001 ]
    Decoding results
    ┌─────────┬──────────────────────────────────┬───────────────────────┐
    │ (index) │              label               │         score         │
    ├─────────┼──────────────────────────────────┼───────────────────────┤
    │    0    │          'giant panda'           │  0.9475338459014893   │
    │    1    │   'Staffordshire bullterrier'    │ 0.0028441373724490404 │
    │    2    │ 'American Staffordshire terrier' │ 0.0027995011769235134 │
    │    3    │         'French bulldog'         │ 0.002384455408900976  │
    │    4    │             'badger'             │ 0.0011667307699099183 │
    └─────────┴──────────────────────────────────┴───────────────────────┘
    img/panda.jpg


The CLI is variadic, so you can add multiple images as well:

    $ npm start img/panda.jpg img/sample_dog.jpg img/sample_computer.jpg

    Setting the model to mobilenet
    Reading and resizing img/panda.jpg
    Reading and resizing img/sample_dog.jpg
    Reading and resizing img/sample_computer.jpg
    Normalizing image data
    Normalizing image data
    Normalizing image data
    Setting input tensor of shape [ 3, 224, 224, 3 ]
    Running model
    Reading output tensor of shape [ 3, 1001 ]
    Decoding results
    ┌─────────┬──────────────────────────────────┬───────────────────────┐
    │ (index) │              label               │         score         │
    ├─────────┼──────────────────────────────────┼───────────────────────┤
    │    0    │          'giant panda'           │  0.9475339651107788   │
    │    1    │   'Staffordshire bullterrier'    │ 0.002844122936949134  │
    │    2    │ 'American Staffordshire terrier' │ 0.002799485344439745  │
    │    3    │         'French bulldog'         │ 0.0023844465613365173 │
    │    4    │             'badger'             │ 0.0011667292565107346 │
    └─────────┴──────────────────────────────────┴───────────────────────┘
    img/panda.jpg
    ┌─────────┬───────────────────┬─────────────────────┐
    │ (index) │       label       │        score        │
    ├─────────┼───────────────────┼─────────────────────┤
    │    0    │    'malamute'     │ 0.3466069996356964  │
    │    1    │   'Eskimo dog'    │ 0.24618299305438995 │
    │    2    │ 'Siberian husky'  │ 0.15509867668151855 │
    │    3    │     'dogsled'     │ 0.03109908662736416 │
    │    4    │ 'German shepherd' │ 0.00960743147879839 │
    └─────────┴───────────────────┴─────────────────────┘
    img/sample_dog.jpg
    ┌─────────┬─────────────────────┬─────────────────────┐
    │ (index) │        label        │        score        │
    ├─────────┼─────────────────────┼─────────────────────┤
    │    0    │      'screen'       │ 0.29382583498954773 │
    │    1    │ 'desktop computer'  │  0.164292573928833  │
    │    2    │ 'computer keyboard' │ 0.08968286216259003 │
    │    3    │       'mouse'       │ 0.06009386107325554 │
    │    4    │      'monitor'      │ 0.05255772918462753 │
    └─────────┴─────────────────────┴─────────────────────┘
    img/sample_computer.jpg

And, it will even take a URL to an image, like this rando I grabbed off the Internet:

<img src="http://guyroyse.com/guy-royse-papis-global-2018.jpg" width="324" height="324">

    $ npm start http://guyroyse.com/guy-royse-papis-global-2018.jpg

Apparently, I'm a fur coat.

    Setting the model to mobilenet
    Reading and resizing http://guyroyse.com/guy-royse-papis-global-2018.jpg
    Normalizing image data
    Setting input tensor of shape [ 1, 224, 224, 3 ]
    Running model
    Reading output tensor of shape [ 1, 1001 ]
    Decoding results
    ┌─────────┬──────────────────────┬──────────────────────┐
    │ (index) │        label         │        score         │
    ├─────────┼──────────────────────┼──────────────────────┤
    │    0    │      'fur coat'      │  0.3993118405342102  │
    │    1    │ 'cellular telephone' │ 0.049747321754693985 │
    │    2    │       'stole'        │ 0.03721235692501068  │
    │    3    │        'wool'        │ 0.03711461275815964  │
    │    4    │        'wig'         │ 0.02954762428998947  │
    └─────────┴──────────────────────┴──────────────────────┘
    http://guyroyse.com/guy-royse-papis-global-2018.jpg
