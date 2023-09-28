class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  Filter() {
    const queryObj = { ...this.queryString };
    const excludedList = ['page', 'sort', 'page', 'limit', 'fields'];
    excludedList.forEach((element) => {
      delete queryObj[element];
    });

    let queryStr = JSON.stringify(queryObj);
    // important implemented using regular expression of javascript
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, (match) => `$${match}`);

    this.query = this.query.find(JSON.parse(queryStr));
    return this;
  }

  Sort() {
    if (this.queryString.sort) {
      const SortBy = this.queryString.sort.split(',').join(' ');
      this.query = this.query.sort(SortBy);
    } else {
      this.query = this.query.sort('-createdAt');
    }

    return this;
  }

  LimitiFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    }

    return this;
  }

  Paginate() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;
    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}

module.exports = APIFeatures;
