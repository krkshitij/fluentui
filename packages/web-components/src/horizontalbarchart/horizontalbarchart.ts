import { attr, FASTElement } from '@microsoft/fast-element';
import { create as d3Create, select as d3Select } from 'd3-selection';
import { createTabster, getGroupper, getMover, getTabsterAttribute, TABSTER_ATTRIBUTE_NAME } from 'tabster';
import { getDataConverter } from '../utils/chart-helpers.js';
import { ChartDataPoint, ChartProps, Variant } from './horizontalbarchart.options.js';

// During the page startup.
const tabsterCore = createTabster(window);
getMover(tabsterCore);
getGroupper(tabsterCore);

/**
 * A Horizontal Bar Chart HTML Element.
 *
 * @public
 */
export class HorizontalBarChart extends FASTElement {
  /**
   * The type of the element, which is always "horizontalbarchart".
   * @see The {@link https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement/type | `type`} property
   *
   * @public
   */
  public get type(): 'horizontalbarchart' {
    return 'horizontalbarchart';
  }

  /**
   * @public
   * The type of the dialog modal
   */
  @attr
  public variant: Variant = Variant.AbsoluteScale;

  /**
   * @public
   * The type of the dialog modal
   */
  @attr
  public _isRTL: boolean = false;

  @attr({ converter: getDataConverter('horizontal-bar-chart') })
  public data!: ChartProps[];

  @attr
  public uniqueLegends: ChartDataPoint[] = [];

  @attr
  public hideRatio = false;

  private barHeight: number = 12;

  constructor() {
    super();
  }

  private bindEvents() {}

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  private createSingleChartBars(singleChartData: ChartProps, index: number, nodes: any) {
    const singleChartBars = this._createBarsAndLegends(singleChartData!, index);

    // create a div element. Loop through chart bars and add to the div as its children
    const divEle = d3Select(nodes[index])
      .attr('key', index)
      .attr('id', `_MSBC_bar-${index}`)
      .node()!
      .appendChild(singleChartBars.node());
  }

  private hydrateLegends() {
    // Create a map to store unique legends
    const uniqueLegendsMap = new Map();

    // Iterate through all chart points and populate the map
    this.data.forEach(dataSeries => {
      dataSeries.chartData!.forEach(point => {
        // Check if the legend is already in the map
        if (!uniqueLegendsMap.has(point.legend)) {
          uniqueLegendsMap.set(point.legend, {
            legend: point.legend,
            data: point.data,
            color: point.color,
          });
        }
      });
    });

    // Convert the map values back to an array
    this.uniqueLegends = Array.from(uniqueLegendsMap.values());
  }

  render() {
    // Array to hold references to the buttons
    const legendButtonRefs: any = [];
    const div = d3Select(this.shadowRoot as any).append('div');
    div
      .append('div')
      .selectAll('div')
      .data(this.data!)
      .enter()
      .append('div')
      .each((d, i, nodes) => {
        this.createSingleChartBars(d, i, nodes);

        //Get the tabster attributes
        const attributes = getTabsterAttribute({ root: {} });

        //Apply attributes directly to the current node
        if (attributes[TABSTER_ATTRIBUTE_NAME] !== undefined) {
          nodes[i].setAttribute(TABSTER_ATTRIBUTE_NAME, attributes[TABSTER_ATTRIBUTE_NAME]);
        }
      });

    this.hydrateLegends();
    const legendContainer = document.createElement('div');
    div.node()!.appendChild(legendContainer);
    legendContainer.classList.add('legendcontainer');

    this.uniqueLegends?.forEach((d, index) => {
      const button = document.createElement('button');
      legendContainer.appendChild(button);
      button.classList.add('legend');
      // Store a reference to the button
      legendButtonRefs[index] = button;

      const legendRect = document.createElement('div');
      button.appendChild(legendRect);
      legendRect.classList.add('legendRect');
      legendRect.style['backgroundColor'] = d.color!;
      legendRect.style['borderColor'] = d.color!;

      const legendText = document.createElement('div');
      button.appendChild(legendText);
      legendText.textContent = d.legend!;
      legendText.classList.add('legendText');
    });

    const bars = this.shadowRoot?.querySelectorAll<HTMLElement>('.bar');

    for (let i = 0; i < legendButtonRefs.length; i++) {
      legendButtonRefs[i].addEventListener('mouseover', () => {
        for (let j = 0; j < bars!.length; j++) {
          if (bars![j].getAttribute('barinfo') !== legendButtonRefs[i].textContent) {
            bars![j].style['opacity'] = '0.1';
          }
        }
        for (let j = 0; j < legendButtonRefs.length; j++) {
          if (j !== i) {
            const legendRect = legendButtonRefs[j].getElementsByClassName('legendRect')[0];
            if (legendRect) {
              legendRect.style['backgroundColor'] = 'transparent';
            } else {
              console.warn(`legendRect not found for button index ${j}`);
            }
            const legendText = legendButtonRefs[j].getElementsByClassName('legendText')[0];
            if (legendText) {
              legendText.style['opacity'] = '0.67';
            } else {
              console.warn(`legendText not found for button index ${j}`);
            }
          }
        }
      });
      legendButtonRefs[i].addEventListener('mouseout', () => {
        for (let j = 0; j < bars!.length; j++) {
          bars![j].style['opacity'] = '1';
        }
        for (let j = 0; j < legendButtonRefs.length; j++) {
          const legendRect = legendButtonRefs[j].getElementsByClassName('legendRect')[0];
          if (legendRect) {
            legendRect.style['backgroundColor'] = this.uniqueLegends[j].color;
          } else {
            console.warn(`legendRect not found for button index ${j}`);
          }

          const legendText = legendButtonRefs[j].getElementsByClassName('legendText')[0];
          if (legendText) {
            legendText.style['opacity'] = '1';
          } else {
            console.warn(`legendText not found for button index ${j}`);
          }
        }
      });
    }
  }

  public _createBarsAndLegends(data: ChartProps, barNo?: number) {
    const _isRTL = this._isRTL;
    const _computeLongestBarTotalValue = () => {
      let longestBarTotalValue = 0;
      this.data!.forEach(({ chartData, chartTitle }) => {
        const barTotalValue = chartData!.reduce(
          (acc: number, point: ChartDataPoint) => acc + (point.data ? point.data : 0),
          0,
        );
        longestBarTotalValue = Math.max(longestBarTotalValue, barTotalValue);
      });
      return longestBarTotalValue;
    };
    const longestBarTotalValue = _computeLongestBarTotalValue();
    const noOfBars =
      data.chartData?.reduce((count: number, point: ChartDataPoint) => (count += (point.data || 0) > 0 ? 1 : 0), 0) ||
      1;
    const barSpacingInPercent = 1;
    const totalMarginPercent = barSpacingInPercent * (noOfBars - 1);
    // calculating starting point of each bar and it's range
    const startingPoint: number[] = [];
    const barTotalValue = data.chartData!.reduce(
      (acc: number, point: ChartDataPoint) => acc + (point.data ? point.data : 0),
      0,
    );
    const total = this.variant === Variant.AbsoluteScale ? longestBarTotalValue : barTotalValue;

    let sumOfPercent = 0;
    data.chartData!.map((point: ChartDataPoint, index: number) => {
      const pointData = point.data ? point.data : 0;
      const currValue = (pointData / total) * 100;
      let value = currValue ? currValue : 0;

      if (value < 1 && value !== 0) {
        value = 1;
      } else if (value > 99 && value !== 100) {
        value = 99;
      }
      sumOfPercent += value;

      return sumOfPercent;
    });

    // Include an imaginary placeholder bar with value equal to
    // the difference between longestBarTotalValue and barTotalValue
    // while calculating sumOfPercent to get correct scalingRatio for absolute-scale variant
    if (this.variant === Variant.AbsoluteScale) {
      let value = total === 0 ? 0 : ((total - barTotalValue) / total) * 100;
      if (value < 1 && value !== 0) {
        value = 1;
      } else if (value > 99 && value !== 100) {
        value = 99;
      }
      sumOfPercent += value;
    }

    /**
     * The %age of the space occupied by the margin needs to subtracted
     * while computing the scaling ratio, since the margins are not being
     * scaled down, only the data is being scaled down from a higher percentage to lower percentage
     * Eg: 95% of the space is taken by the bars, 5% by the margins
     * Now if the sumOfPercent is 120% -> This needs to be scaled down to 95%, not 100%
     * since that's only space available to the bars
     */

    const scalingRatio = sumOfPercent !== 0 ? sumOfPercent / (100 - totalMarginPercent) : 1;

    let prevPosition = 0;
    let value = 0;

    function createBars(this: SVGGElement, point: ChartDataPoint, index: number) {
      const barHeight = 12;
      const pointData = point.data ? point.data : 0;
      if (index > 0) {
        prevPosition += value;
      }
      value = (pointData / total) * 100 ? (pointData / total) * 100 : 0;
      if (value < 1 && value !== 0) {
        value = 1 / scalingRatio;
      } else if (value > 99 && value !== 100) {
        value = 99 / scalingRatio;
      } else {
        value = value / scalingRatio;
      }

      startingPoint.push(prevPosition);

      const gEle = d3Select(this) // 'this' refers to the current 'g' element
        .attr('key', index)
        .attr('role', 'img')
        .attr('aria-label', pointData);

      gEle
        .append('rect')
        .attr('key', index)
        .attr('id', `${barNo}-${index}`)
        .attr('barinfo', `${point.legend}`)
        .attr('class', 'bar')
        .attr('style', `fill:${point.color!}`)
        .attr(
          'x',
          `${
            _isRTL
              ? 100 - startingPoint[index] - value - barSpacingInPercent * index
              : startingPoint[index] + barSpacingInPercent * index
          }%`,
        )
        .attr('y', 0)
        .attr('width', value + '%')
        .attr('height', barHeight)
        .attr('tabindex', 0)
        .attr('data-tabster', '{"groupper": {...}}"')
        .attr('data-tabster', '{"mover": {...}}"');
    }

    const containerDiv = d3Create('div').attr('style', 'position: relative');

    let tooltip: any;

    const chartTitleDiv = containerDiv.append('div').attr('class', 'chartTitleDiv');
    chartTitleDiv
      .append('div')
      .append('span')
      .attr('class', 'chartTitle')
      .text(data?.chartTitle ? data?.chartTitle : '');

    const hideNumber = this.hideRatio === undefined ? false : this.hideRatio;

    const showRatio = this.variant === Variant.PartToWhole && !hideNumber && data!.chartData!.length === 2;
    const getChartData = () => (data!.chartData![0].data ? data!.chartData![0].data : 0);

    if (showRatio) {
      const ratioDiv = chartTitleDiv.append('div').attr('role', 'text');
      const numData = data!.chartData![0].data;
      const denomData = data!.chartData![1].data;
      const total = numData! + denomData!;
      ratioDiv.append('span').attr('class', 'ratioNumerator').text(numData!);
      ratioDiv.append('span').attr('class', 'ratioDenominator').text(`/${total!}`);
    }

    const svgEle = containerDiv
      .append('svg')
      .attr('height', 20)
      .attr('width', 100 + '%')
      .attr('aria-label', data?.chartTitle ? data?.chartTitle : '')
      .selectAll('g')
      .data(data.chartData!)
      .enter()
      .append('g')
      .each(createBars)
      .on('mouseover', function (event, d) {
        const tooltipHTML = `
        <div class="tooltipline" style="border-left:4px solid ${d.color};">
            <div class="tooltiplegend">${d.legend}</div>
            <div class="tooltipdata" style="color: ${d.color};">${d.data}</div>
        </div>
       `;
        tooltip = containerDiv
          .append('div')
          .attr('class', 'tooltip')
          .attr(
            'style',
            'opacity: 1; left: ' +
              (event.pageX - containerDiv.node()!.getBoundingClientRect().left + window.scrollX) +
              'px; top: ' +
              (event.pageY - (containerDiv.node()!.getBoundingClientRect().top + window.scrollY) - 40) +
              'px;',
          );
        tooltip.html(tooltipHTML);
      })
      .on('mouseout', function () {
        tooltip.attr('style', 'position: absolute; opacity:0');
      });

    if (this.variant === Variant.AbsoluteScale) {
      const showLabel = true;
      const barLabel = barTotalValue;

      if (showLabel) {
        svgEle
          .append('text')
          .attr('key', 'text')
          .attr('class', 'barLabel')
          .attr(
            'x',
            `${
              this._isRTL
                ? 100 - (startingPoint[startingPoint.length - 1] || 0) - value - totalMarginPercent
                : (startingPoint[startingPoint.length - 1] || 0) + value + totalMarginPercent
            }%`,
          )
          .attr('textAnchor', 'start')
          .attr('y', this.barHeight / 2 + 6)
          .attr('dominantBaseline', 'central')
          .attr('transform', `translate(${this._isRTL ? -4 : 4})`)
          .attr('aria-label', `Total: ${barLabel}`)
          .attr('role', 'img')
          .text(barLabel);
      }
    }
    return containerDiv;
  }
}
