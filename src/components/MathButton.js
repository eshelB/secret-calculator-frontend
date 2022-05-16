import React, { Component } from "react";

export default class MathButton extends Component {
  render() {
    return (
      <div className="MathButton">
        <label>
          <button onClick={this.props.onclick}>
            {this.props.label}
          </button>
        </label>
      </div>
    );
  }
}
