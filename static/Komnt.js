//
// TODO:
// * Use anchors in URL instead of query params (when possible). Query params
// fuck up requests to some sites (Twitter)
// * BeforeUnload, ask if wanna bookmark for later (w/annotations) and offer
// bookmark btn from popup
// * Short CSS Path can be shorter. Regex doesnt catch multiple classes or when
// just tagname w/out class
// * Limit chars/# of comments? (figure out what the max is)
//
// * Auto save when clicking out the box?
// * Icons
// * GH page, then push on twitter, yc, reddit
//
// * share link should generate a link with pre-JS ala: `javascript:if (extension
// exists) take to page (else) create modal that will offer installing it. Click
// on install should directly install it on machine
//
//

(function (w, d) {

    'use strict';

    w.Komnt || (w.Komnt = {});

    var DELIMITER = ':';
    var REGEX = /(\?|^|&|#)komnt=(.*)(&|$)/;

    // Determing whether we can use anchor/hash
    var isHashAvailable = !location.hash || REGEX.test(location.hash);

    var Komnt = w.Komnt.Komnt = function () {
        this.mouseupHandler = this.mouseupHandler.bind(this);
        this.hideAllBodies  = this.hideAllBodies.bind(this);

        this.comments = [];

        this.parseCommentsFromUri();

        // TODO: deboune on DOM insertion instead of onload. Re-layout then as well.
        setTimeout(this.layoutComments.bind(this), 1000);
    };

    Komnt.prototype.toggle = function () {
        return this[w.Komnt._isEnabled ? 'disable' : 'enable']();
    };

    /**
     * Binds listener to highlight (new comment)
     */
    Komnt.prototype.enable = function () {
        this.showAllHighlights();

        if (!w.Komnt._isEnabled) {
            d.addEventListener('mouseup', this.mouseupHandler);
            d.addEventListener('click', this.hideAllBodies);
        }

        return w.Komnt._isEnabled = true;
    };

    Komnt.prototype.disable = function () {
        this.hideAll();
        if (w.Komnt._isEnabled) {
            d.removeEventListener('mouseup', this.mouseupHandler);
            d.removeEventListener('click', this.hideAllBodies);
        }

        return w.Komnt._isEnabled = false;
    };


    /**
     * Parses comments from URI and stores in this.comments
     */
    Komnt.prototype.parseCommentsFromUri = function () {
        var comment;
        var matches = location.hash.match(REGEX) || location.search.match(REGEX);
        if (matches && (matches = matches[2]))
            this.comments = matches
                .split(DELIMITER)
                .map(w.Komnt.Comment.fromUri.bind(this));
    };

    /**
     * Updates the URI in the address bar based on the comments
     */
    Komnt.prototype.updateUri = function () {
        var newAddition = this.comments.map(function (comment) {
            return comment.toUri();
        }).join(DELIMITER);

        newAddition && (newAddition = 'komnt=' + newAddition);

        if (isHashAvailable)
            newAddition = '#' + newAddition;
        else {
            var search = location.search;
            if (search) {
                newAddition = REGEX.test(search)
                    ? search.replace(REGEX, "$1" + newAddition + "$3")
                    : search + '&' + newAddition;
            } else {
                newAddition = '?' + newAddition;
            }

            newAddition += location.hash;
        }

        w.history.pushState(null, null, newAddition);
    };

    /**
     * Copies share link to clipboard
     */
    Komnt.prototype.shareLink = function () {
        if (!w.Komnt._isEnabled)
            return;

        this.updateUri();
        var handler = function (e) {
            e.preventDefault();
            e.clipboardData.setData('Text', location.href);
            alert('Copied to clipboard');
            d.removeEventListener('click', handler);
        };
        d.addEventListener('copy', handler);
        d.execCommand("Copy", false, null);
    };

    /**
     * Lays out all comments on the page
     */
    Komnt.prototype.layoutComments = function () {
        this.comments.forEach(function (comment) {
            // abort if el not on page or underlying text changed
            if (comment.highlight.anchorEl && !comment.hasTextChanged())
                comment.layout(this.bindCommentClicks.bind(this));
        }.bind(this));
    };

    /**
     * New range/comment
     */
    Komnt.prototype.mouseupHandler = function (e) {
        if (e.ctrlKey || e.metaKey) {
            var selection = d.getSelection();

            // dont count our spans
            var nodeIndex = [].filter.call(e.target.childNodes, function (node) {
                return !node.className || !~node.className.indexOf('komnt');
            }).indexOf(selection.anchorNode);

            if (selection.type === 'Range' && ~nodeIndex)
                return this.addComment(e.target, {
                    'nodeIndex' : nodeIndex,
                    'start'     : Math.min(selection.anchorOffset, selection.focusOffset),
                    'stop'      : Math.max(selection.anchorOffset, selection.focusOffset)
                });
        }

        return true;
    };

    /**
     * Komnt clicks
     */
    Komnt.prototype.clickHandler = function (e, comment) {
        var action, el = e.currentTarget;

        if (action = e.target.dataset.komnt_action || el.dataset.komnt_action) {
            e.preventDefault();
            e.stopPropagation();
            return this[action + 'Comment'](comment);
        }
    };

    /**
     * TODO: dont think this is a good way
     * Bind Komnt's clickHandler to the underlying elements
     */
    Komnt.prototype.bindCommentClicks = function (comment) {
        var clickHandler = function (e) {
            this.clickHandler(e, comment);
        }.bind(this);

        comment.highlight.element().addEventListener('click', clickHandler);
        comment.body.element().addEventListener('click', clickHandler);
    };

    Komnt.prototype.addComment = function (element, range) {
        var comment = new w.Komnt.Comment(element, range);
        this.comments.push(comment
            .layout(this.bindCommentClicks.bind(this))
            .show()
            .edit()
        );
    };

    /**
     * Remove comment from DOM and from this.comments
     */
    Komnt.prototype.removeComment = function (comment) {
        comment.remove();
        // remove comment from array
        this.comments.splice(this.comments.indexOf(comment), 1);
        this.updateUri();
    };

    Komnt.prototype.editComment = function (comment) {
        comment.edit();
    };

    Komnt.prototype.saveComment = function (comment) {
        comment.save();
        this.updateUri();
    };

    Komnt.prototype.showComment = function (comment) {
        this.comments.forEach(function (comment) {
            comment.body.element().classList.remove('active');
        });
        comment.show();
    };

    Komnt.prototype.showAllHighlights = function () {
        if (w.Komnt._isEnabled)
            this.comments.forEach(function (comment) {
                comment.highlight.show();
            });
    };

    Komnt.prototype.hideAllBodies = function () {
        this.comments.forEach(function (comment) {
            comment.body.hide();
        });
    };

    Komnt.prototype.hideAll = function () {
        this.comments.forEach(function (comment) {
            comment.highlight.hide();
            comment.body.hide();
        });
    };

    Komnt.prototype.showAll = function () {
        if (w.Komnt._isEnabled)
            this.comments.forEach(function (comment) {
                comment.highlight.show();
                comment.body.show();
            });
    };

    Komnt.prototype.removeAll = function () {
        if (confirm('Are you sure?'))
            this.comments.forEach(this.removeComment.bind(this));
    };

})(
    window,
    document
);