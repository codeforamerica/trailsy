Trailsy
=======

Trailsy is the front-end component of To The Trails, a project developed by Code for America fellows working with partners in Summit County, Ohio.

To The Trails is a web application where citizens can find information about the trail network of their region.
The app incorporates data from multiple agencies and park stewards, including the Cuyahoga Valley National Park and Metro Parks, Serving Summit County.
To The Trails helps citizens find trails that fit their needs based on attributes like length, amenities and activities.

The current production version is at [http://tothetrails.com]().

#### Credits

The team includes

* [Dan Avery][danavery], developer
* [Katie Lewis][katie], designer
* [Alan Williams][alanjosephwilliams], third wheel

[katie]: https://github.com/katielewis
[danavery]: https://github.com/danavery
[alanjosephwilliams]: https://github.com/alanjosephwilliams

You can contact us all together through our team e-mail address at summitco@codeforamerica.org.

## Setup

*(For quick step-by-step instructions for creating a new deploy of To The Trails/Trailsy, try the [new deploy instructions](https://github.com/codeforamerica/trailsy/wiki/Deploying-a-New-Instance) on the project [wiki](https://github.com/codeforamerica/trailsy/wiki).)*

This front-end code is self-contained and can be used with any existing instance of [Trailsyserver](http://www.github.com/codeforamerica/trailsyserver), which provides a REST-like API to trail data. Almost all of the Trailsy-specific code is in `js/trailhead.js`. Change `API_HOST` at the beginning of that file to point to a Trailsyserver instance, and serve up the app directory with the HTTP server of your choice.

This repository is included as a submodule of Trailsyserver in its `/public` directory, but can be hosted separately, and should be during development unless you're well acquainted with the subtleties of git submodules.  See the [docs on deploying new versions](https://github.com/codeforamerica/trailsy/wiki/Pushing-New-Versions-To-Heroku) for information on keeping the submodule code up to date.

The app is lightly customized for use in Summit County, but can be repurposed for other areas with minimal effort. There is a constant named AKRON in trailhead.js that can be changed to whatever default location you desire.

## Contributing
In the spirit of [free software][free-sw], **everyone** is encouraged to help
improve this project. 

[free-sw]: http://www.fsf.org/licensing/essays/free-sw.html

Here are some ways *you* can contribute:

* by reporting bugs
* by suggesting new features
* by translating to a new language
* by writing or editing documentation
* by writing specifications
* by writing code (**no patch is too small**: fix typos, add comments, clean up
  inconsistent whitespace)
* by refactoring code
* by closing [issues][]
* by reviewing patches
* [financially][]

[issues]: https://github.com/codeforamerica/codeforamerica/trailsy/issues
[financially]: https://secure.codeforamerica.org/page/contribute

## Submitting an Issue

Please note that this application is still an in-development prototype. 

We use the [GitHub issue tracker][issues] to track bugs and features. Before
submitting a bug report or feature request, check to make sure it hasn't
already been submitted. You can indicate support for an existing issue by
voting it up. When submitting a bug report, please include any details that might 
be necessary to reproduce the bug.

## Submitting a Pull Request
1. Fork the project.
2. Create a topic branch.
3. Implement your feature or bug fix.
4. Commit and push your changes.
5. Submit a pull request.

## Copyright
Copyright (c) 2013 Code for America. See [LICENSE][] for details.

[license]: https://github.com/codeforamerica/streetmix/blob/master/LICENSE.md
