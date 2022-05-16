import React, { Component } from "react";

const arithmeticSigns = {
  Add: "+",
  Sub: "–",
  Mul: "×",
  Div: "÷"
}

export default class History extends Component {
  render() {
    if (this.props.history_loading) {
      return <div>Loading History...</div>;
    }

    if (this.props.history_error) {
      return <div>Error Getting History</div>;
    }

    let listItems = []

    if (this.props.total <= 0) {
      listItems = [<div key="nocalc"> No Past Calculations </div>];
    } else {
      listItems = this.props.calcs.map((calculation, index) => {
        if (calculation.operation === "Sqrt") {
          return <div key={index}>
            √( { calculation.left_operand } ) = { calculation.result }
          </div>
        }

        return <div key={index}>
          { calculation.left_operand } &nbsp;
          { arithmeticSigns[calculation.operation] } &nbsp;
          { calculation.right_operand } = { calculation.result }
        </div>
      });
    }

    const lowerIndex = Math.min(this.props.total, this.props.page * this.props.page_size + 1);
    const upperIndex = Math.min(this.props.total, (this.props.page + 1) * this.props.page_size);

    return (
      <div className="History">
        <p>
          History of calculations (Showing {lowerIndex}-{upperIndex} out of {this.props.total}):
        </p>
        <div className="b">
          {listItems}
        </div>
      </div>
    );
  }
}
