export class CESRProccessor {
  public static removeEvent(cesr: string, eventType: string) {
    const parsedCesr = this.parseCesr(cesr);
    let result: string = "";
    for (const event of parsedCesr) {
      if (event.json.t != eventType) {
        result += `${JSON.stringify(event.json)}${event.signature}`;
      }
    }
    return result;
  }

  public static parseCesr(cesr: string) {
    const signatureRegex = /(?<=})(-.*?)(?={|$)/g;
    const signatures = cesr.match(signatureRegex) || [];
    let jsonString = `[${cesr.replace(signatureRegex, ",").trim()}]`.replace(
      /,(?=[^,]*$)/,
      "",
    );

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch (error) {
      console.error("Invalid JSON:", error);
      return null;
    }
    const parsedCesr = parsedJson
      .map((jsonItem: any, index: number) => {
        return {
          signature: signatures[index],
          json: jsonItem,
        };
      })
      .filter((item: any) => item !== null);

    return parsedCesr;
  }
}
