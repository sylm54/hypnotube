const PLATFORM = "Hypnotube";

var config = {};
var settings = {};
//Source Methods
source.enable = function (conf, settings, savedState) {
  config = conf ?? {};
  settings = settings ?? {};
  const client = http.getDefaultClient(false);
  client.setDoApplyCookies(true);
  client.setDoUpdateCookies(true);
  client.setDoAllowNewCookies(true);
};

source.getHome = function () {
  log("getHome");
  log("Settings:\n" + JSON.stringify(settings, null, "   "));
  let category = "most-recent";
  switch (settings["mainfeed"]) {
    case "Latest":
      category = "most-recent";
      break;
    case "Top Rated":
      category = "top-rated";
      break;
    case "Most Discussed":
      category = "most-discussed";
      break;
    case "Most Viewed":
      category = "most-viewed";
      break;
  }
  let time = "";
  switch (settings["mainfeed_time"]) {
    case "All Time":
      time = "";
      break;
    case "Today":
      time = "day/";
      break;
    case "Week":
      time = "week/";
      break;
    case "Month":
      time = "month/";
      break;
  }
  log(`https://hypnotube.com/${category}/${time}`);
  return new FeedPager(`https://hypnotube.com/${category}/${time}`);
};

source.searchSuggestions = function (query) {
  return [];
};
source.getSearchCapabilities = () => {
  return {
    types: [Type.Feed.Mixed],
    sorts: [Type.Order.Chronological],
    filters: [],
  };
};
source.search = function (query, type, order, filters) {
  throw new ScriptException("This is a sample");
  //   let res = http.POST(
  //     "https://hypnotube.com/searchgate.php?q=" +
  //       encodeURI(query) +
  //       "&type=videos",
  //     "",
  // 	{},
  //     false
  //   );
  //   if (!res.isOk) {
  //     throw new ScriptException(
  //       "Error trying to post search for '" + query + "'"
  //     );
  //   }
  //   return new FeedPager("https://hypnotube.com/search/" + encodeURI(query));
};
source.getSearchChannelContentsCapabilities = function () {
  return {
    types: [Type.Feed.Mixed],
    sorts: [Type.Order.Chronological],
    filters: [],
  };
};

source.searchChannelContents = function (
  channelUrl,
  query,
  type,
  order,
  filters
) {
  throw new ScriptException("This is a sample");
};

source.searchChannels = function (query) {
  throw new ScriptException("This is a sample");
};

//Channel
source.isChannelUrl = function (url) {
  return url.includes("hypnotube.com/user");
};
source.getChannel = function (url) {
  let res = http.GET(url, {}, false);
  if (!res.isOk) {
    throw new ScriptException("Error trying to load '" + geturl + "'");
  }
  let dom = domParser.parseFromString(res.body);
  const img = dom
    .querySelector(".profile-img-avatar")
    .querySelector("img")
    .getAttribute("src");
  const id = parseInt(url.split("-")[1]);
  return new PlatformChannel({
    id: new PlatformID("Hypnotube", "" + id, config.id),
    banner: img,
    thumbnail: img,
    url: url,
    name: dom
      .querySelector(".profile-field-username")
      .querySelector(".sub-desc").text,
  });
};
source.getChannelContents = function (url) {
  const id = parseInt(url.split("-")[1]);
  return new FeedPager("https://hypnotube.com/uploads-by-user/" + id);
};

//Video
source.isContentDetailsUrl = function (url) {
  return url.includes("hypnotube.com/video");
};
source.getContentDetails = function (url) {
  return new HVideo(url);
};

class HVideo extends PlatformVideoDetails {
  constructor(url) {
    let res = http.GET(url, {}, false);
    if (!res.isOk) {
      throw new ScriptException("Error trying to load '" + geturl + "'");
    }
    let dom = domParser.parseFromString(res.body);
    let inner = dom.querySelector(".content-inner-col");
    let vidurl = inner.querySelector("source").getAttribute("src");
    let user = dom.querySelector("a.name_normal");
    super({
      id: new PlatformID(PLATFORM, url, config.id),
      name: inner.querySelector(".item-tr-col h1").text,
      thumbnails: new Thumbnails([]),
      author:
        user != undefined
          ? new PlatformAuthorLink(
            new PlatformID(PLATFORM, user.getAttribute("href"), config.id), //obj.channel.name, config.id),
            user.querySelector(".user-name").text, //obj.channel.displayName,
            user.getAttribute("href"), //obj.channel.url,
            user.querySelector("img").getAttribute("src"),
            ""
          )
          : undefined,
      // datetime: Math.round((new Date(ldJson.uploadDate)).getTime() / 1000),
      // duration: flashvars.video_duration,
      // viewCount: views,
      url: url,
      isLive: false,
      description: dom.querySelector('meta[name="description"]').text,
      video: new VideoSourceDescriptor([
        new VideoUrlSource({
          container: "video/mp4",
          name: "mp4",
          width: 1920,
          height: 1080,
          url: vidurl,
        }),
      ]),
    });
    this.recvids = getVideos(dom.querySelectorAll(".related-col .item-col"));
  }

  getContentRecommendations() {
    return new ContentPager(this.recvids, false);
  }
}
source.getContentRecommendations = (url, initialData) => {
  throw new ScriptException("getContentRecommendations");
};

//Comments
source.getComments = function (url) {
  const vidid = parseInt(url.split("-")[1].split(".")[0]);
  const commenturl =
    "https://hypnotube.com/templates/hypnotube/template.ajax_comments.php?id=" +
    vidid;
  let res = http.GET(commenturl, {}, false);
  if (!res.isOk) {
    throw new ScriptException("Error trying to load '" + geturl + "'");
  }
  if (
    res.body.includes(
      "There are no comments for this video. Please leave your feedback and be the first!"
    )
  ) {
    return new CommentPager([], false);
  }
  let dom = domParser.parseFromString(res.body);
  dom.querySelectorAll("li").map((item) => {
    let name = item.querySelector("strong").text;
    return new Comment({
      author: new PlatformAuthorLink(
        new PlatformID(PLATFORM, name, config.id),
        name,
        item.querySelector("a").getAttribute("href"),
        item.querySelector("img").getAttribute("src"),
        ""
      ),
      message: item.querySelector("p").text,
    });
  });
  return new CommentPager(
    [
      new Comment({
        author: new PlatformAuthorLink(
          new PlatformID(PLATFORM, c.username, config.id),
          c.username,
          "",
          c.avatar,
          ""
        ),
      }),
    ],
    false
  );
};
source.getSubComments = function (comment) {
  throw new ScriptException("This is a sample");
};

class FeedPager extends ContentPager {
  constructor(url) {
    super([], true);
    this.url = url;
    this.page = 0;
    this.nextPage();
  }
  nextPage() {
    this.page++;
    const geturl = this.url + "/page" + this.page + ".html";
    log("Geturlv: " + geturl + " Cookie: " + this.cookie);
    let res = undefined;
    res = http.GET(geturl, {}, false);

    if (!res.isOk) {
      throw new ScriptException("Error trying to load '" + geturl + "'");
    }
    if (res.body.includes("Sorry, no results were found.")) {
      this.hasMore = false;
      this.results = [];
      return this;
    }
    if (
      res.body.includes(
        "Search error, please use the search box at the top of the page."
      )
    ) {
      throw new ScriptException("Search Error");
    }
    let dom = domParser.parseFromString(res.body);
    let inner = dom.querySelector(".main-inner-col");
    if (inner == undefined) {
      throw new ScriptException(
        "Error parsing html trying to load '" + geturl + "'"
      );
    }
    this.results = getVideos(inner.querySelectorAll("div.item-col"));
    if (this.results.length == 0) {
      this.hasMore = false;
    }
    log("Got " + this.results.length + " results");
    return this;
  }
}

function getVideos(items) {
  const videos = [];
  for (let item of items) {
    let titlehref = item.querySelector("a");
    let img = item.querySelector("img");
    //log("Getting video: " + titlehref.getAttribute("title"));
    if (img == undefined) continue;
    let duration = -1;
    try {
      let time = item.querySelector(".time").text.split(":");
      duration = parseInt(time[0]) * 60 + parseInt(time[1]);
    } catch (e) { }
    videos.push(
      new PlatformVideo({
        id: new PlatformID(
          "Hypnotube",
          titlehref.getAttribute("href"),
          config.id
        ),
        name: titlehref.getAttribute("title"),
        thumbnails: new Thumbnails([
          new Thumbnail(item.querySelector("img")?.getAttribute("src"), 720),
        ]),
        //   author: new PlatformAuthorLink(
        //     new PlatformID("SomePlatformName", "SomeAuthorID", config.id),
        //     "SomeAuthorName",
        //     "https://platform.com/your/channel/url",
        //     "../url/to/thumbnail.png"
        //   ),
        //   uploadDate: 1696880568,
        duration: duration,
        viewCount: parseInt(item.querySelector(".sub-desc").text),
        url: titlehref.getAttribute("href"),
        isLive: false,
      })
    );
  }
  return videos;
}

log("LOADED");
