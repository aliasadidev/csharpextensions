/**
 * Created by velten on 11.02.17.
 */

/**
 * Adds brackets before and after a part of string
 * @param str string the hole regex string
 * @param start int marks the position where ( should be inserted
 * @param end int marks the position where ) should be inserted
 * @param groupsAdded int defines the offset to the original string because of inserted brackets
 * @return {string}
 */
function addGroupToRegexString(str: any, start: any, end: any, groupsAdded: any) {
    start += groupsAdded * 2;
    end += groupsAdded * 2;
    return str.substring(0, start) + '(' + str.substring(start, end + 1) + ')' + str.substring(end + 1);
}

/**
 * converts the given regex to a regex where all not captured string are going to be captured
 * it along sides generates a mapper which maps the original group index to the shifted group offset and
 * generates a list of groups indexes (including new generated capturing groups)
 * which have been closed before a given group index (unshifted)
 *
 * Example:
 * regexp: /a(?: )bc(def(ghi)xyz)/g => /(a(?: )bc)((def)(ghi)(xyz))/g
 * groupIndexMapper: {'1': 2, '2', 4}
 * previousGroupsForGroup: {'1': [1], '2': [1, 3]}
 *
 * @param regex RegExp
 * @return {{regexp: RegExp, groupIndexMapper: {}, previousGroupsForGroup: {}}}
 */

function fillGroups(regex: any) {
    let regexString;
    let modifier;
    if (regex.source && regex.flags) {
        regexString = regex.source;
        modifier = regex.flags;
    }
    else {
        regexString = regex.toString();
        modifier = regexString.substring(regexString.lastIndexOf(regexString[0]) + 1); // sometimes order matters ;)
        regexString = regexString.substr(1, regex.toString().lastIndexOf(regexString[0]) - 1);
    }
    // regexp is greedy so it should match (? before ( right?
    // brackets may be not quoted by \
    // closing bracket may look like: ), )+, )+?, ){1,}?, ){1,1111}?
    const tester = /(\\\()|(\\\))|(\(\?)|(\()|(\)(?:\{\d+,?\d*}|[*+?])?\??)/g;

    let modifiedRegex = regexString;

    let lastGroupStartPosition = -1;
    let lastGroupEndPosition = -1;
    let lastNonGroupStartPosition = -1;
    let lastNonGroupEndPosition = -1;
    let groupsAdded = 0;
    let groupCount = 0;
    let matchArr;
    const nonGroupPositions = [];
    const groupPositions = [];
    const groupNumber = [];
    let currentLengthIndexes: any = [];
    const groupIndexMapper: any = {};
    const previousGroupsForGroup: any = {};
    while ((matchArr = tester.exec(regexString)) !== null) {
        // if (matchArr[1] || matchArr[2]);
        if (matchArr[3]) { // non capturing group (?
            let index = matchArr.index + matchArr[0].length - 1;

            lastNonGroupStartPosition = index;
            nonGroupPositions.push(index);
        }
        else if (matchArr[4]) { // capturing group (
            let index = matchArr.index + matchArr[0].length - 1;

            let lastGroupPosition = Math.max(lastGroupStartPosition, lastGroupEndPosition);

            // if a (? is found add ) before it
            if (lastNonGroupStartPosition > lastGroupPosition) {
                // check if between ) of capturing group lies a non capturing group
                if (lastGroupPosition < lastNonGroupEndPosition) {
                    // add groups for x1 and x2 on (?:()x1)x2(?:...
                    if ((lastNonGroupEndPosition - 1) - (lastGroupPosition + 1) > 0) {
                        modifiedRegex = addGroupToRegexString(modifiedRegex, lastGroupPosition + 1, lastNonGroupEndPosition - 1, groupsAdded);
                        groupsAdded++;
                        lastGroupEndPosition = lastNonGroupEndPosition - 1; // imaginary position as it is not in regex but modifiedRegex
                        currentLengthIndexes.push(groupCount + groupsAdded);
                    }

                    if ((lastNonGroupStartPosition - 1) - (lastNonGroupEndPosition + 1) > 0) {
                        modifiedRegex = addGroupToRegexString(modifiedRegex, lastNonGroupEndPosition + 1, lastNonGroupStartPosition - 2, groupsAdded);
                        groupsAdded++;
                        lastGroupEndPosition = lastNonGroupStartPosition - 1; // imaginary position as it is not in regex but modifiedRegex
                        currentLengthIndexes.push(groupCount + groupsAdded);
                    }
                }
                else {
                    modifiedRegex = addGroupToRegexString(modifiedRegex, lastGroupPosition + 1, lastNonGroupStartPosition - 2, groupsAdded);
                    groupsAdded++;
                    lastGroupEndPosition = lastNonGroupStartPosition - 1; // imaginary position as it is not in regex but modifiedRegex
                    currentLengthIndexes.push(groupCount + groupsAdded);
                }

                // if necessary also add group between (? and opening bracket
                if (index > lastNonGroupStartPosition + 2) {
                    modifiedRegex = addGroupToRegexString(modifiedRegex, lastNonGroupStartPosition + 2, index - 1, groupsAdded);
                    groupsAdded++;
                    lastGroupEndPosition = index - 1; // imaginary position as it is not in regex but modifiedRegex
                    currentLengthIndexes.push(groupCount + groupsAdded);
                }
            }
            else if (lastGroupPosition < index - 1) {
                modifiedRegex = addGroupToRegexString(modifiedRegex, lastGroupPosition + 1, index - 1, groupsAdded);
                groupsAdded++;
                lastGroupEndPosition = index - 1; // imaginary position as it is not in regex but modifiedRegex
                currentLengthIndexes.push(groupCount + groupsAdded);
            }

            groupCount++;
            lastGroupStartPosition = index;
            groupPositions.push(index);
            groupNumber.push(groupCount + groupsAdded);
            groupIndexMapper[groupCount] = groupCount + groupsAdded;
            previousGroupsForGroup[groupCount] = currentLengthIndexes.slice();
        }
        else if (matchArr[5]) { // closing bracket ), )+, )+?, ){1,}?, ){1,1111}?
            let index = matchArr.index + matchArr[0].length - 1;

            if ((groupPositions.length && !nonGroupPositions.length) ||
                groupPositions[groupPositions.length - 1] > nonGroupPositions[nonGroupPositions.length - 1]
            ) {
                if (lastGroupStartPosition < lastGroupEndPosition && lastGroupEndPosition < index - 1) {
                    modifiedRegex = addGroupToRegexString(modifiedRegex, lastGroupEndPosition + 1, index - 1, groupsAdded);
                    groupsAdded++;
                    //lastGroupEndPosition = index - 1; will be set anyway
                    currentLengthIndexes.push(groupCount + groupsAdded);
                }

                groupPositions.pop();
                lastGroupEndPosition = index;

                let toPush: any = groupNumber.pop();
                currentLengthIndexes.push(toPush);
                currentLengthIndexes = currentLengthIndexes.filter((index: any) => index <= toPush);
            }
            else if (nonGroupPositions.length) {
                nonGroupPositions.pop();
                lastNonGroupEndPosition = index;
            }
        }
    }

    return { regexp: new RegExp(modifiedRegex, modifier), groupIndexMapper, previousGroupsForGroup };
}


export class MultiRegExp2 {
    regexp: any;
    groupIndexMapper: any;
    previousGroupsForGroup: any;
    private baseRegExp: any = /(\b(?:namespace)(?:\s+)?(?:(?:(?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/)|(?:(?<!\:|\\\|\')\/\/.*))|(?:\s+))(?:\s+)?)(@?[a-z_A-Z]\w+(?:\.@?[a-z_A-Z]\w+)*)\b/gm
    constructor() {
        const { regexp, groupIndexMapper, previousGroupsForGroup } = fillGroups(this.baseRegExp);
        this.regexp = regexp;
        this.groupIndexMapper = groupIndexMapper;
        this.previousGroupsForGroup = previousGroupsForGroup;
    }



    execForAllGroups(string: any, includeFullMatch: any) {
        let matches: any = RegExp.prototype.exec.call(this.regexp, string);
        if (!matches) return matches;
        let firstIndex = matches.index;
        let indexMapper = includeFullMatch ? Object.assign({ 0: 0 }, this.groupIndexMapper) : this.groupIndexMapper;
        let previousGroups = includeFullMatch ? Object.assign({ 0: [] }, this.previousGroupsForGroup) : this.previousGroupsForGroup;

        return Object.keys(indexMapper).map((group) => {
            let mapped = indexMapper[group];
            let r = {
                match: matches[mapped],
                start: firstIndex + previousGroups[group].reduce(
                    (sum: any, i: any) => sum + (matches[i] ? matches[i].length : 0), 0
                ),
                end: null
            };
            r.end = r.start + (matches[mapped] ? matches[mapped].length : 0);

            return r;
        });
    }

    execForGroup(string: any, group: any) {
        const matches = RegExp.prototype.exec.call(this.regexp, string);
        if (!matches) return matches;
        const firstIndex = matches.index;

        const mapped = group == 0 ? 0 : this.groupIndexMapper[group];
        const previousGroups = group == 0 ? [] : this.previousGroupsForGroup[group];
        let r = {
            match: matches[mapped],
            start: firstIndex + previousGroups.reduce(
                (sum: any, i: any) => sum + (matches[i] ? matches[i].length : 0), 0
            ),
            end: null
        };
        r.end = r.start + (matches[mapped] ? matches[mapped].length : 0);

        return r;
    }
}

// export default MultiRegExp2;