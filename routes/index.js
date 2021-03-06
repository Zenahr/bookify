const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Book = require("../models/Book-model.js");
const List = require("../models/List-model.js");
const User = require("../models/User.js");
const SuggestedBook = require("../models/SuggestedBook-model.js");
const SpecialBook = require("../models/SpecialBook-model.js");

// custom routes, will be split into route files later:

router.get("/dashboard/getbooks", (request, response) => {
  Book.find()
    .then((allBooksFromDb) => {
      response.send(allBooksFromDb);
    })
    .catch((error) => {
      console.log(
        "backend: error getting books from database in backend: ",
        error
      );
      next();
    });
});

router.delete("/dashboard/deletebooks/:title", (request, response) => {
  Book.findOneAndDelete(request.params.title);
});

router.post("/saveBookWhenClickShare", (request, response, next) => {
  // destructuring: if variables is not passed by API -> initialized with 'undefined'
  const { isbn, title, cover, by, year, url } = request.body.book;

  //console.log("backend: book object: ", request.body.book);

  // Step 1 of 2: Check by book title if Book is already existing in database, if not -> create Book:
  Book.findOne({ title: title })
    .then((bookExists) => {
      if (bookExists != null) {
        response.send("backend: book exists already, go on in frontend");
        return;
      } else {
        Book.create({
          isbn: isbn,
          title: title,
          by: by,
          year: year,
          cover: cover,
          url: url,
        })
          .then((bookCreated) => {
            console.log("backend: successfully created book: ", bookCreated);
            response.send("backend: created book, go on in frontend");
            return;
          })
          .catch((error) => {
            console.log(error);
            next();
          });
      }
    })
    .catch((error) => {
      console.log("backend: Error finding book: ", error);
      next();
    });
});

router.post("/dashboard/saveToList", (request, response, next) => {
  // destructuring: if variables is not passed by API -> initialized with 'undefined'
  const { isbn, title, cover, by, year, url } = request.body.book;

  console.log("backend: book object: ", request.body.book);

  const listName = request.body.list;

  // Step 1 of 2: Check by book title if Book is already existing in database, if not -> create Book:
  Book.findOne({ title: title })
    .then((bookExists) => {
      if (bookExists != null) {
        console.log("backend: Book exists already, checking for List now");
        return;
      } else {
        Book.create({
          isbn: isbn,
          title: title,
          by: by,
          year: year,
          cover: cover,
          url: url,
        })
          .then((bookCreated) => {
            console.log("backend: successfully created book: ", bookCreated);
          })
          .catch((error) => {
            console.log(error);
            next();
          });
      }
    })
    .catch((error) => {
      console.log("backend: Error finding book: ", error);
      next();
    });

  // Step 2 of 2: Check by list name if List is already existing in database, if not -> create List and push Book to books property:
  List.findOne({ name: listName, owner: request.user._id })
    .then((listExists) => {
      if (listExists != null) {
        console.log("backend: List found");

        Book.findOne({ title: title })
          .then((bookExists) => {
            console.log("backend: returned value for book: ", bookExists);
            List.findOne({
              name: listName,
              owner: request.user._id,
              books: bookExists,
            })
              .then((listOfUserWithBookExists) => {
                if (listOfUserWithBookExists != null) {
                  console.log("backend: Book exists already in this List");
                  return;
                } else {
                  List.updateOne(
                    { name: listName, owner: request.user._id },
                    { $push: { books: bookExists } }
                  )
                    .then((listUpdated) => {
                      console.log("backend: List got updated: ", listUpdated);
                      response.send("done");
                      return;
                    })
                    .catch((error) => {
                      console.log("backend: Error updating List: ", error);
                      next();
                    });
                }
              })
              .catch((error) => {
                console.log(
                  "backend: Error finding book in user list: ",
                  error
                );
                next();
              });
          })
          .catch((error) => {
            console.log("backend: Error finding Book: ", error);
            next();
          });
      } else {
        List.create({
          name: listName,
          owner: request.user._id,
          books: [],
        })
          .then((newList) => {
            console.log("backend: New list created: ", newList);
            Book.findOne({ title: title })
              .then((bookExists) => {
                List.updateOne(
                  { name: listName, owner: request.user._id },
                  { $push: { books: bookExists } }
                )
                  .then((listUpdated) => {
                    console.log("backend: List got updated: ", listUpdated);
                    response.send("done");
                    return;
                  })
                  .catch((error) => {
                    console.log("backend: Error updating List: ", error);
                    next();
                  });
              })
              .catch((error) => {
                console.log("backend: Error finding Book: ", error);
                next();
              });
          })
          .catch((error) => {
            console.log("backend: Error creating List: ", error);
            next();
          });
      }
    })
    .catch((error) => {
      console.log("backend: Error finding List: ", error);
      next();
    });
});

router.get("/dashboard/getUserList", (request, response, next) => {
  List.find({ owner: request.user._id })
    .populate("books")
    .populate("special")
    .then((allListsOfUser) => {
      console.log(allListsOfUser);
      response.send(allListsOfUser);
    })
    .catch((error) => {
      console.log("backend: Error getting all lists of user: ", error);
      next();
    });
});

router.post("/addList", (request, response, next) => {
  List.findOne({ name: request.body.name, owner: request.user._id })
    .then((listExists) => {
      if (listExists !== null) {
        console.log("backend: list with this name already exists");
        response.send("already exists");
      } else {
        List.create({
          name: request.body.name,
          owner: request.user._id,
        })
          .then((newList) => {
            console.log("backend: new list created: ", newList);
            response.send("done");
          })
          .catch((error) => {
            console.log("backend: Error at creating new list ", error);
            next();
          });
      }
    })
    .catch((error) => {
      console.log("backend: error creating new list: ", error);
      next();
    });
});

router.post("/deleteList", (request, response, next) => {
  List.findOneAndDelete({ owner: request.user._id, name: request.body.name })
    .then((list) => {
      console.log("backend: list deleted");
      response.send("done");
    })
    .catch((error) => {
      console.log("backend: Error deleting list: ", error);
      next();
    });
});

router.post("/deleteBookFromList", (request, response, next) => {
  const { book, list } = request.body;

  if (list == "Special") {
    SpecialBook.findOne({ title: book })
      .then((bookObject) => {
        console.log("backend: found book: ", bookObject);
        List.updateOne(
          { owner: request.user._id, name: list },
          { $pull: { special: bookObject._id } }
        )
          .then((list) => {
            console.log("backend: Book removed from List: ", list);
            response.send("done");
          })
          .catch((error) => {
            console.log("backend: Error removing book from list: ", error);
            next();
          });
      })
      .catch((error) => {
        console.log("backend: Error finding book: ", error);
        next();
      });
  } else {
    Book.findOne({ title: book })
      .then((bookObject) => {
        console.log("backend: found book: ", bookObject);
        List.updateOne(
          { owner: request.user._id, name: list },
          { $pull: { books: bookObject._id } }
        )
          .then((list) => {
            //console.log("Book removed from List: ", list);
            response.send("done");
          })
          .catch((error) => {
            console.log("backend: Error removing book from list: ", error);
            next();
          });
      })
      .catch((error) => {
        console.log("backend: Error finding book: ", error);
        next();
      });
  }
});

router.post("/getBook", (request, response, next) => {
  Book.find({ title: request.body.title })
    .then((book) => {
      response.send(book);
    })
    .catch((error) => {
      console.log("backend: Error finding book: ", error);
      next();
    });
});

router.post("/getSpecialBook", (request, response, next) => {
  SpecialBook.find({ title: request.body.title })
    .then((book) => {
      response.send(book);
    })
    .catch((error) => {
      console.log("backend: Error finding book: ", error);
      next();
    });
});

router.post("/shareBook", (request, response, next) => {
  Book.findOne({ title: request.body.title })
    .then((book) => {
      console.log("backend: found book: ", book);
      SuggestedBook.create({
        isbn: book.isbn,
        title: book.title,
        by: book.by,
        year: book.year,
        cover: book.cover,
        url: book.url,
        suggestedBy: request.user.username,
        comment: request.body.comment,
      })
        .then((suggestedBook) => {
          console.log("backend: creating suggested book: ", suggestedBook);
          User.findOneAndUpdate(
            { username: request.body.friend },
            { $push: { suggestedBooks: suggestedBook } }
          )
            .populate("suggestedBooks")
            .then((updated) => {
              if (updated != null) {
                console.log("backend: Book successfully shared: ", updated);
                response.send("Success");
              } else {
                console.log("backend: User not found!: ", updated);
                response.send("Failure");
              }
            })
            .catch((error) => {
              console.log("backend: Error at updating user: ", error);
              next();
            });
        })
        .catch((error) => {
          console.log("backend: Error at creating suggestedBook: ", error);
          next();
        });
    })
    .catch((error) => {
      console.log("backend: Error at finding book: ", error);
      next();
    });
});

router.get("/getSuggestedBooksList", (request, response, next) => {
  User.findOne({ _id: request.user._id })
    .populate("suggestedBooks")
    .then((user) => {
      response.send(user.suggestedBooks);
    })
    .catch((error) => {
      console.log("error getting books from database in backend: ", error);
      next();
    });
});

router.post("/rejectSuggestion", (request, response, next) => {
  const { title, suggestedBy, comment } = request.body;

  SuggestedBook.deleteOne({
    title: title,
    suggestedBy: suggestedBy,
    comment: comment,
  })
    .then((sBook) => {
      console.log("Backend: removed suggested book successfully: ", sBook);
      response.send("removed");
    })
    .catch((error) => {
      console.log("backend: Error at removing suggested book: ", error);
      next();
    });
});

router.post("/acceptSuggestion", (request, response, next) => {
  const { title, suggestedBy, comment } = request.body;
  const listName = "Special";

  List.findOne({ name: listName, owner: request.user._id }).then((exists) => {
    if (exists != null) {
      console.log("backend: list exists already, adding book now");
      SuggestedBook.findOne({
        title: title,
        suggestedBy: suggestedBy,
        comment: comment,
      })
        .then((sBook) => {
          console.log("backend: suggested book found: ", sBook);
          SpecialBook.findOne({
            title: sBook.title,
            suggestedBy: sBook.suggestedBy,
          })
            .then((spBookExists) => {
              console.log("backend: special book found: ", spBookExists);
              if (spBookExists != null) {
                List.updateOne(
                  { name: listName, owner: request.user._id },
                  { $push: { special: spBookExists } }
                )
                  .then((updatedList) => {
                    console.log("backend: updated list: ", updatedList);
                    response.send("done");
                  })
                  .catch((error) => {
                    console.log("backend: error at updating fav list: ", error);
                    next();
                  });
              } else {
                SpecialBook.create({
                  isbn: sBook.isbn,
                  title: sBook.title,
                  by: sBook.by,
                  year: sBook.year,
                  cover: sBook.cover,
                  url: sBook.url,
                  suggestedBy: sBook.suggestedBy,
                })
                  .then((spBookCreated) => {
                    console.log(
                      "backend: special book created: ",
                      spBookCreated
                    );
                    SpecialBook.updateOne(
                      {
                        title: spBookCreated.title,
                        suggestedBy: spBookCreated.suggestedBy,
                      },
                      { $push: { comments: sBook.comment } }
                    ).then((spBookUpdated) => {
                      console.log(
                        "backend: specialBook updated: ",
                        spBookUpdated
                      );
                      List.updateOne(
                        { name: listName, owner: request.user._id },
                        { $push: { special: spBookCreated } }
                      )
                        .then((updatedList) => {
                          console.log("backend: updated list: ", updatedList);
                          response.send("done");
                        })
                        .catch((error) => {
                          console.log(
                            "backend: error at updating fav list: ",
                            error
                          );
                          next();
                        });
                    });
                    SuggestedBook.deleteOne({
                      title: title,
                      suggestedBy: suggestedBy,
                    }).then((sBookDeleted) => {
                      console.log(
                        "backend: suggestedBook deleted: ",
                        sBookDeleted
                      );
                    });
                    //response.send("done");
                  })
                  .catch((error) => {
                    console.log(
                      "backend: error at creating special book ",
                      error
                    );
                    next();
                  });
              }
            })
            .catch((error) => {
              console.log("backend: error at finding special book: ", error);
              next();
            });
        })
        .catch((error) => {
          console.log("backend: error at finding suggested book: ", error);
          next();
        });
    } else {
      List.create({
        name: listName,
        owner: request.user._id,
      })
        .then((newList) => {
          console.log("backend: created new list: ", newList);
          SuggestedBook.findOne({
            title: title,
            suggestedBy: suggestedBy,
            comment: comment,
          })
            .then((sBook) => {
              console.log("backend: found suggested book: ", sBook);
              SpecialBook.findOne({
                title: sBook.title,
                suggestedBy: sBook.suggestedBy,
              })
                .then((spBookExists) => {
                  if (spBookExists != null) {
                    console.log("backend: specialBook exists: ", spBookExists);
                    List.updateOne(
                      { name: listName, owner: request.user._id },
                      { $push: { special: spBookExists } }
                    )
                      .then((favList) => {
                        console.log("backend: updated list xxx: ", favList);
                        response.send("done");
                      })
                      .catch((error) => {
                        console.log(
                          "backend: error at updating fav list xxx: ",
                          error
                        );
                        next();
                      });
                  } else {
                    SpecialBook.create({
                      isbn: sBook.isbn,
                      title: sBook.title,
                      by: sBook.by,
                      year: sBook.year,
                      cover: sBook.cover,
                      url: sBook.url,
                      suggestedBy: sBook.suggestedBy,
                    })
                      .then((spBookCreated) => {
                        console.log(
                          "backend: special book created here: ",
                          spBookCreated
                        ); // ??
                        SpecialBook.updateOne(
                          {
                            title: spBookCreated.title,
                            suggestedBy: spBookCreated.suggestedBy,
                          },
                          { $push: { comments: sBook.comment } }
                        )
                          .then((spBookUpdated) => {
                            console.log(
                              "backend: specialBook updated here: ",
                              spBookUpdated
                            );

                            SpecialBook.findOne({
                              title: spBookCreated.title,
                              suggestedBy: spBookCreated.suggestedBy,
                            }).then((spBookFound) => {
                              List.updateOne(
                                { name: listName, owner: request.user._id },
                                { $push: { special: spBookFound } }
                              )
                                .then((updatedList) => {
                                  console.log(
                                    "backend: updated list: ",
                                    updatedList
                                  );
                                  response.send("done");
                                })
                                .catch((error) => {
                                  console.log(
                                    "backend: error at updating fav list: ",
                                    error
                                  );
                                  next();
                                });
                            });
                          })
                          .catch((error) => {
                            console.log(
                              "backend: error updating special book here: ",
                              error
                            );
                          });
                        SuggestedBook.deleteOne({
                          title: title,
                          suggestedBy: suggestedBy,
                        })
                          .then((sBookDeleted) => {
                            console.log(
                              "backend: suggestedBook deleted: ",
                              sBookDeleted
                            );
                            //response.send("done");
                          })
                          .catch((error) => {
                            console.log(
                              "backend: error deleting suggested book here: ",
                              error
                            );
                          });
                      })
                      .catch((error) => {
                        console.log(
                          "backend: error at creating special book ",
                          error
                        );
                        next();
                      });
                  }
                })
                .catch((error) => {
                  console.log(
                    "backend: error at finding special book: ",
                    error
                  );
                  next();
                });
            })
            .catch((error) => {
              console.log("backend: error at finding suggested book: ", error);
              next();
            });
        })
        .catch((error) => {
          console.log("backend: error at creating list: ", error);
          next();
        });
    }
  });
});

module.exports = router;
