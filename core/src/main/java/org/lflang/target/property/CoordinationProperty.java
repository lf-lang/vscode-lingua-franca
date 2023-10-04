package org.lflang.target.property;

import java.util.Arrays;
import java.util.List;
import org.lflang.AbstractTargetProperty;
import org.lflang.MessageReporter;
import org.lflang.Target;
import org.lflang.ast.ASTUtils;
import org.lflang.lf.Element;
import org.lflang.target.property.type.CoordinationModeType;
import org.lflang.target.property.type.CoordinationModeType.CoordinationMode;

/** Directive to specify the coordination mode */
public class CoordinationProperty
    extends AbstractTargetProperty<CoordinationMode, CoordinationModeType> {

  public CoordinationProperty() {
    super(new CoordinationModeType());
  }

  @Override
  public CoordinationMode initialValue() {
    return CoordinationMode.CENTRALIZED;
  }

  @Override
  public CoordinationMode fromAst(Element node, MessageReporter reporter) {
    return fromString(ASTUtils.elementToSingleString(node), reporter);
  }

  @Override
  protected CoordinationMode fromString(String string, MessageReporter reporter) {
    return ((CoordinationModeType) this.type).forName(string);
  }

  @Override
  public List<Target> supportedTargets() {
    return Arrays.asList(Target.C, Target.CCPP, Target.Python);
  }

  @Override
  public Element toAstElement() {
    return ASTUtils.toElement(this.get().toString());
  }

  @Override
  public String name() {
    return "coordination";
  }
}
